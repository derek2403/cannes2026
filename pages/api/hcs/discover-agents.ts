import type { NextApiRequest, NextApiResponse } from "next";
import {
  readTopicMessages,
  computeHCS2State,
} from "@/lib/hcs-standards";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { registryTopicId } = req.body;

    if (!registryTopicId) {
      return res.status(400).json({ error: "registryTopicId is required" });
    }

    // Step 1: Read registry to get all registered agent profile topic IDs
    const registryMessages = await readTopicMessages(registryTopicId);
    const entries = computeHCS2State(registryMessages);

    // Step 2: For each entry, fetch the HCS-11 profile from the profile topic
    const agents = await Promise.all(
      entries.map(async (entry) => {
        try {
          const profileMessages = await readTopicMessages(entry.t_id, 1);
          const profile =
            profileMessages.length > 0 ? profileMessages[profileMessages.length - 1] : null;
          return {
            registryUid: entry.uid,
            profileTopicId: entry.t_id,
            registryMemo: entry.m,
            profile,
          };
        } catch {
          return {
            registryUid: entry.uid,
            profileTopicId: entry.t_id,
            registryMemo: entry.m,
            profile: null,
            error: "Failed to fetch profile",
          };
        }
      })
    );

    return res.json({
      registryTopicId,
      agentCount: agents.length,
      agents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
