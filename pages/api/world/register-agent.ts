import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { checkAgentHuman } from "@/lib/world-agentkit";
import { getClient } from "@/lib/hedera";
import {
  submitMessage,
  getOperatorKey,
  buildWorldIdLog,
} from "@/lib/hcs-standards";

const AGENT_BOOK_CONTRACT = "0xA23aB2712eA7BBa896930544C7d6636a96b944dA";
const RELAY_URL = "https://x402-worldchain.vercel.app/register";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { evmAddress, root, nonce, nullifierHash, proof, agentName } = req.body;

  if (!evmAddress || !root || !nullifierHash || !proof) {
    return res.status(400).json({
      error: "Missing required fields: evmAddress, root, nullifierHash, proof",
    });
  }

  try {
    // ── Step 1: Relay registration to AgentBook ─────────────────
    const registration = {
      agent: evmAddress,
      root,
      nonce: nonce?.toString() || "0",
      nullifierHash,
      proof,
      contract: AGENT_BOOK_CONTRACT,
    };

    const relayRes = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registration),
    });

    if (!relayRes.ok) {
      const body = await relayRes.text();
      return res.status(502).json({
        error: `AgentBook relay failed: ${relayRes.status}: ${body}`,
      });
    }

    const relayResult = await relayRes.json();
    const txHash = relayResult.txHash || "";

    // ── Step 2: Verify registration via lookupHuman ────────────
    let humanId: string | null = null;
    try {
      humanId = await checkAgentHuman(evmAddress);
    } catch {
      // lookupHuman may take a moment to propagate
    }

    // ── Step 3: Update hedera-state.json ────────────────────────
    const statePath = join(process.cwd(), "hedera-state.json");
    const state = JSON.parse(readFileSync(statePath, "utf-8"));

    const agentEntry = state.agents?.find(
      (a: { evmAddress?: string; displayName?: string }) =>
        a.evmAddress === evmAddress.replace("0x", "") ||
        a.evmAddress === evmAddress ||
        a.displayName === agentName
    );

    if (agentEntry) {
      agentEntry.worldVerified = true;
      agentEntry.humanId = humanId;
      writeFileSync(statePath, JSON.stringify(state, null, 2));
    }

    // ── Step 4: Log World ID verification to HCS ────────────────
    try {
      const client = getClient();
      getOperatorKey(); // ensure key is available

      const registryTopicId = state.registryTopicId;
      if (registryTopicId && humanId) {
        const worldLog = buildWorldIdLog(evmAddress, humanId, txHash);
        await submitMessage(client, registryTopicId, worldLog);
      }

      // Also log to agent's profile topic
      if (agentEntry?.profileTopicId && humanId) {
        const worldLog = buildWorldIdLog(evmAddress, humanId, txHash);
        await submitMessage(client, agentEntry.profileTopicId, worldLog);
      }

      client.close();
    } catch {
      // HCS logging is best-effort
    }

    return res.status(200).json({
      success: true,
      txHash,
      humanId,
      evmAddress,
      worldVerified: humanId !== null,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
