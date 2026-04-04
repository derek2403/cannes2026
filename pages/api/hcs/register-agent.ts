import type { NextApiRequest, NextApiResponse } from "next";
import { getClient } from "@/lib/hedera";
import {
  createTopic,
  submitMessage,
  getOperatorKey,
  buildHCS11Profile,
  buildHCS2Register,
} from "@/lib/hcs-standards";
import type { AgentProfileLinks } from "@/lib/hcs-standards";
import fs from "fs";
import path from "path";

const STATE_FILE = path.join(process.cwd(), "hedera-state.json");

function readState(): Record<string, unknown> {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return { agents: [], registryTopicId: null, reputationTopicId: null };
}

function writeState(state: Record<string, unknown>) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    displayName,
    accountId,
    capabilities,
    model,
    bio,
    registryTopicId,
    reputationTopicId,
    floraTopicIds,
  } = req.body;

  if (!displayName || !accountId) {
    return res.status(400).json({ error: "displayName and accountId are required" });
  }

  try {
    const client = getClient();
    const operatorKey = getOperatorKey();

    // 1. Create HCS-11 profile topic
    const profileTopicId = await createTopic(
      client,
      `hcs-11:profile:${accountId}`,
      operatorKey.publicKey
    );

    // 2. Build profile with all linked HCS topics
    const links: AgentProfileLinks = {
      reputationTopicId: reputationTopicId || undefined,
      registryTopicId: registryTopicId || undefined,
      floraTopicIds: floraTopicIds || undefined,
    };

    const profileMsg = buildHCS11Profile(
      displayName,
      accountId,
      capabilities || [2, 11, 16, 20],
      model || "oracle-v1",
      bio || `${displayName} — oracle agent for prediction market resolution`,
      links
    );

    const profileResult = await submitMessage(client, profileTopicId, profileMsg);

    // 3. Register in HCS-2 registry if registryTopicId provided
    let registryResult = null;
    if (registryTopicId) {
      const regMsg = buildHCS2Register(
        profileTopicId,
        `agent | ${displayName} | ${accountId}`
      );
      registryResult = await submitMessage(client, registryTopicId, regMsg);
    }

    client.close();

    // 4. Save to local state file for future sessions
    const state = readState();
    const agents = (state.agents as unknown[]) || [];
    const agentEntry = {
      displayName,
      accountId,
      profileTopicId,
      reputationTopicId: reputationTopicId || null,
      registryTopicId: registryTopicId || null,
      floraTopicIds: floraTopicIds || null,
      capabilities: capabilities || [2, 11, 16, 20],
      model: model || "oracle-v1",
      createdAt: new Date().toISOString(),
    };
    agents.push(agentEntry);
    state.agents = agents;
    if (registryTopicId) state.registryTopicId = registryTopicId;
    if (reputationTopicId) state.reputationTopicId = reputationTopicId;
    writeState(state);

    return res.json({
      agent: agentEntry,
      profile: profileResult,
      registry: registryResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
