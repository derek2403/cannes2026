import type { NextApiRequest, NextApiResponse } from "next";
import { ethers, keccak256, toUtf8Bytes } from "ethers";
import { ZgFile, Indexer } from "@0gfoundation/0g-ts-sdk";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { encrypt } from "@/lib/encrypt";
import { SPARKINFT_ADDRESS, SPARKINFT_ABI } from "@/lib/sparkinft-abi";
import { getClient } from "@/lib/hedera";
import {
  createTopic,
  submitMessage,
  getOperatorKey,
  buildHCS11Profile,
  buildHCS2Register,
} from "@/lib/hcs-standards";
import type { AgentProfileLinks } from "@/lib/hcs-standards";

const ZG_RPC = "https://evmrpc-testnet.0g.ai";
const ZG_INDEXER = "https://indexer-storage-testnet-turbo.0g.ai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const {
    agentName,
    domainTags = "oracle,research",
    serviceOfferings = "evidence-analysis,voting",
    modelProvider = "0g-compute",
    apiKey = "",
    systemPrompt = "",
    researchInstructions = "",
    reputation = 10,
    ownerAddress,        // Optional: mint iNFT to this address (nanobot's wallet)
    hederaAccountId: inputHederaId, // Optional: nanobot's own Hedera account
  } = req.body;

  if (!agentName) {
    return res.status(400).json({ error: "agentName is required" });
  }

  const privateKey = process.env.ZG_STORAGE_PRIVATE_KEY;
  if (!privateKey || privateKey === "YOUR_PRIVATE_KEY_HERE") {
    return res
      .status(500)
      .json({ error: "ZG_STORAGE_PRIVATE_KEY not configured in .env.local" });
  }

  try {
    // ── Step 1: Build & upload config to 0G Storage ──────────────
    const agentConfig: Record<string, unknown> = {
      version: "1.0.0",
      botId: agentName,
      persona: agentName,
      modelProvider,
      systemPrompt,
      researchInstructions,
      memory: {},
      domainTags,
      serviceOfferings,
      metadata: {
        created: new Date().toISOString(),
        type: "spark-agent",
        standard: "ERC-7857",
      },
    };

    if (apiKey) {
      agentConfig.apiKey = encrypt(apiKey);
      agentConfig.encrypted = true;
    }

    const configJson = JSON.stringify(agentConfig, null, 2);
    const configHash = keccak256(toUtf8Bytes(configJson)) as `0x${string}`;

    const provider = new ethers.JsonRpcProvider(ZG_RPC);
    const signer = new ethers.Wallet(privateKey, provider);

    let dataDescription: string;
    let rootHash = "";
    let uploadTxHash = "";

    try {
      const indexer = new Indexer(ZG_INDEXER);
      const tmpPath = join(tmpdir(), `spark-agent-${Date.now()}.json`);
      writeFileSync(tmpPath, configJson);

      const zgFile = await ZgFile.fromFilePath(tmpPath);
      const [tree, treeErr] = await zgFile.merkleTree();
      if (treeErr || !tree) throw new Error(`Merkle tree: ${treeErr}`);

      const rh = tree.rootHash();
      if (!rh) throw new Error("Empty root hash");
      rootHash = rh;
      const [uploadResult, uploadErr] = await indexer.upload(
        zgFile,
        ZG_RPC,
        signer
      );
      if (uploadErr) throw new Error(`Upload: ${uploadErr}`);

      uploadTxHash =
        "txHash" in uploadResult
          ? (uploadResult.txHash as string)
          : (uploadResult.txHashes[0] as string);

      await zgFile.close();
      unlinkSync(tmpPath);
      dataDescription = `0g://storage/${rootHash}`;
    } catch {
      // Fallback if 0G Storage is unavailable
      dataDescription = `spark-agent://${agentName}`;
    }

    // ── Step 2: Mint iNFT on-chain ──────────────────────────────
    // If ownerAddress provided (nanobot), mint to that address.
    // Otherwise mint to server wallet.
    const mintTo = ownerAddress || signer.address;

    const contract = new ethers.Contract(
      SPARKINFT_ADDRESS,
      SPARKINFT_ABI,
      signer
    );

    const mintTx = await contract.mintAgent(
      mintTo,
      agentName,
      domainTags,
      serviceOfferings,
      [{ dataDescription, dataHash: configHash }]
    );
    const receipt = await mintTx.wait();

    // Extract tokenId from AgentMinted event
    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "AgentMinted") {
          tokenId = Number(parsed.args[0]); // tokenId is first indexed param
          break;
        }
      } catch {
        /* skip non-matching logs */
      }
    }

    if (tokenId === null) {
      // Fallback: read totalMinted
      const total = await contract.totalMinted();
      tokenId = Number(total);
    }

    // ── Step 3: Authorize wallets for inference ─────────────────
    // Always authorize the server wallet (needed for resolve commands).
    // If a different ownerAddress was provided (nanobot), they're the
    // owner so they're auto-authorized. Server needs explicit auth.
    if (ownerAddress && ownerAddress.toLowerCase() !== signer.address.toLowerCase()) {
      // iNFT owned by nanobot — authorize the server so it can
      // call infer during resolve-1/resolve-2
      try {
        const authTx = await contract.authorizeUsage(
          BigInt(tokenId),
          signer.address
        );
        await authTx.wait();
      } catch {
        // Owner is the caller, might not have auth to authorize
        // (only owner can call authorizeUsage). Since server minted
        // via mintAgent, the contract may auto-set owner. If the
        // contract transferred ownership, server can still call as deployer.
      }
    }
    // Also authorize server on server-owned tokens (no-op if already owner)
    if (!ownerAddress) {
      try {
        const authTx = await contract.authorizeUsage(
          BigInt(tokenId),
          signer.address
        );
        await authTx.wait();
      } catch {
        // Already authorized as owner
      }
    }

    // ── Step 4: Register on Hedera (HCS-11 profile + HCS-2 registry) ──
    const statePath = join(process.cwd(), "hedera-state.json");
    const state = JSON.parse(readFileSync(statePath, "utf-8"));

    const registryTopicId = state.registryTopicId || null;
    const reputationTopicId = state.reputationTopicId || null;

    let profileTopicId: string | null = null;
    let hederaAccountId: string | null = null;

    try {
      const client = getClient();
      const operatorKey = getOperatorKey();

      // Use nanobot's Hedera ID if provided, otherwise server operator
      hederaAccountId = inputHederaId || process.env.HEDERA_OPERATOR_ID || null;

      // Create HCS-11 profile topic for this agent
      profileTopicId = await createTopic(
        client,
        `hcs-11:profile:${hederaAccountId}`,
        operatorKey.publicKey
      );

      // Build and submit HCS-11 profile with linked topics
      const links: AgentProfileLinks = {
        reputationTopicId: reputationTopicId || undefined,
        registryTopicId: registryTopicId || undefined,
      };

      const profileMsg = buildHCS11Profile(
        agentName,
        hederaAccountId || "",
        [2, 11, 16, 20],
        modelProvider,
        `${agentName} — iNFT #${tokenId} oracle agent for prediction market resolution`,
        links
      );

      await submitMessage(client, profileTopicId, profileMsg);

      // Register in HCS-2 registry
      if (registryTopicId) {
        const regMsg = buildHCS2Register(
          profileTopicId,
          `agent | ${agentName} | ${hederaAccountId} | inft:${tokenId}`
        );
        await submitMessage(client, registryTopicId, regMsg);
      }

      client.close();
    } catch {
      // Hedera registration is best-effort — don't fail the whole mint
    }

    // ── Step 5: Update hedera-state.json ────────────────────────
    const existingIdx = state.agents.findIndex(
      (a: { displayName: string }) => a.displayName === agentName
    );

    const agentEntry = {
      ...(existingIdx >= 0 ? state.agents[existingIdx] : {}),
      displayName: agentName,
      accountId: hederaAccountId,
      ownerAddress: mintTo,
      profileTopicId,
      reputationTopicId,
      registryTopicId,
      floraTopicIds: null,
      capabilities: [2, 11, 16, 20],
      inftTokenId: tokenId,
      modelProvider,
      model: modelProvider,
      reputation,
      domainTags,
      serviceOfferings,
      createdAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      state.agents[existingIdx] = {
        ...state.agents[existingIdx],
        ...agentEntry,
      };
    } else {
      state.agents.push(agentEntry);
    }

    writeFileSync(statePath, JSON.stringify(state, null, 2));

    // ── Return result ───────────────────────────────────────────
    return res.status(200).json({
      success: true,
      tokenId,
      ownerAddress: mintTo,
      serverAddress: signer.address,
      txHash: mintTx.hash,
      dataDescription,
      rootHash,
      uploadTxHash,
      hedera: {
        accountId: hederaAccountId,
        profileTopicId,
        registryTopicId,
        reputationTopicId,
      },
      agent: {
        agentName,
        inftTokenId: tokenId,
        modelProvider,
        reputation,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
