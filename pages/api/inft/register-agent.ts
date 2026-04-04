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
  buildHCS20Mint,
  buildRegistrationLog,
  buildBotRegistrationLog,
} from "@/lib/hcs-standards";
import type { AgentProfileLinks } from "@/lib/hcs-standards";

const ZG_RPC = "https://evmrpc-testnet.0g.ai";
const ZG_INDEXER = "https://indexer-storage-testnet-turbo.0g.ai";

/**
 * Phase 3 of agent registration (after Hedera account + World ID verification):
 *   1. Upload agent config to 0G Storage (with humanId baked in)
 *   2. Mint iNFT on 0G Chain
 *   3. Create HCS-11 profile (with humanId + all cross-links)
 *   4. Register in HCS-2 registry
 *   5. Master HCS log + Bot HCS log
 *   6. HCS-20 reputation mint
 *   7. Update hedera-state.json
 *
 * Accepts Phase 1 output (hederaAccountId, evmAddress, encryptedAgentKey)
 * and Phase 2 output (humanId, worldVerified) as inputs.
 */
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
    ownerAddress,
    // Phase 1 outputs
    hederaAccountId,
    evmAddress,
    encryptedAgentKey,
    // Phase 2 outputs
    humanId = null,
    worldVerified = false,
  } = req.body;

  if (!agentName) {
    return res.status(400).json({ error: "agentName is required" });
  }

  if (!hederaAccountId || !evmAddress) {
    return res.status(400).json({
      error: "Missing hederaAccountId or evmAddress. Call /api/inft/prepare-agent first.",
    });
  }

  const privateKey = process.env.ZG_STORAGE_PRIVATE_KEY;
  if (!privateKey || privateKey === "YOUR_PRIVATE_KEY_HERE") {
    return res
      .status(500)
      .json({ error: "ZG_STORAGE_PRIVATE_KEY not configured in .env.local" });
  }

  try {
    // ── Step 1: Build & upload config to 0G Storage ──────────────
    // humanId is baked in from the start (available from Phase 2)
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
      hederaAccountId,
      evmAddress,
      worldVerified,
      humanId,
      metadata: {
        created: new Date().toISOString(),
        type: "spark-agent",
        standard: "ERC-7857",
        network: "hedera-testnet",
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
      dataDescription = `spark-agent://${agentName}`;
    }

    // ── Step 2: Mint iNFT on-chain ──────────────────────────────
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

    let tokenId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "AgentMinted") {
          tokenId = Number(parsed.args[0]);
          break;
        }
      } catch {
        /* skip non-matching logs */
      }
    }

    if (tokenId === null) {
      const total = await contract.totalMinted();
      tokenId = Number(total);
    }

    // ── Steps 3-6: HCS registration + logging ──────────────────
    let profileTopicId: string | null = null;
    const hederaClient = getClient();
    const operatorKey = getOperatorKey();

    try {
      // Step 3: HCS-11 profile
      profileTopicId = await createTopic(
        hederaClient,
        `hcs-11:profile:${hederaAccountId}`,
        operatorKey.publicKey
      );

      const statePath = join(process.cwd(), "hedera-state.json");
      const state = JSON.parse(readFileSync(statePath, "utf-8"));
      const registryTopicId = state.registryTopicId || null;
      const reputationTopicId = state.reputationTopicId || null;

      const links: AgentProfileLinks = {
        reputationTopicId: reputationTopicId || undefined,
        registryTopicId: registryTopicId || undefined,
        inftTokenId: tokenId!,
        zgRootHash: rootHash || undefined,
        evmAddress,
        worldVerified,
        humanId,
      };

      const profileMsg = buildHCS11Profile(
        agentName,
        hederaAccountId,
        [2, 11, 16, 20],
        modelProvider,
        `${agentName} — iNFT #${tokenId} oracle agent for prediction market resolution`,
        links
      );
      await submitMessage(hederaClient, profileTopicId, profileMsg);

      // Step 4: HCS-2 registry
      if (registryTopicId) {
        const regMsg = buildHCS2Register(
          profileTopicId,
          `agent | ${agentName} | ${hederaAccountId} | inft:${tokenId} | 0g:${rootHash}`
        );
        await submitMessage(hederaClient, registryTopicId, regMsg);
      }

      // Step 5: Master HCS log
      if (registryTopicId) {
        const masterLog = buildRegistrationLog({
          agentName,
          hederaAccountId,
          evmAddress,
          zgRootHash: rootHash,
          inftTokenId: tokenId!,
          profileTopicId,
          worldVerified,
          humanId,
        });
        await submitMessage(hederaClient, registryTopicId, masterLog);
      }

      // Bot HCS log
      const botLog = buildBotRegistrationLog({
        agentName,
        hederaAccountId,
        evmAddress,
        zgRootHash: rootHash,
        inftTokenId: tokenId!,
        profileTopicId,
        worldVerified,
        humanId,
      });
      await submitMessage(hederaClient, profileTopicId, botLog);

      // Step 6: HCS-20 reputation mint
      if (reputationTopicId) {
        const repMint = buildHCS20Mint(
          "rep",
          String(reputation),
          hederaAccountId,
          `Initial reputation for ${agentName}`
        );
        await submitMessage(hederaClient, reputationTopicId, repMint);
      }

      // ── Step 7: Update hedera-state.json ──────────────────────
      const existingIdx = state.agents.findIndex(
        (a: { displayName: string }) => a.displayName === agentName
      );

      const agentEntry = {
        ...(existingIdx >= 0 ? state.agents[existingIdx] : {}),
        displayName: agentName,
        accountId: hederaAccountId,
        privateKeyEncrypted: encryptedAgentKey || null,
        evmAddress,
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
        worldVerified,
        humanId,
        zgRootHash: rootHash || null,
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

      hederaClient.close();

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
          evmAddress,
          profileTopicId,
          registryTopicId,
          reputationTopicId,
        },
        world: {
          verified: worldVerified,
          humanId,
        },
        agent: {
          agentName,
          inftTokenId: tokenId,
          modelProvider,
          reputation,
        },
      });
    } catch (hcsErr) {
      hederaClient.close();
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
          evmAddress,
          profileTopicId: null,
          error: hcsErr instanceof Error ? hcsErr.message : String(hcsErr),
        },
        world: { verified: worldVerified, humanId },
        agent: {
          agentName,
          inftTokenId: tokenId,
          modelProvider,
          reputation,
        },
      });
    }
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
