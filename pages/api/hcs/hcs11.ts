import type { NextApiRequest, NextApiResponse } from "next";
import { getClient } from "@/lib/hedera";
import {
  createTopic,
  submitMessage,
  readTopicMessages,
  getOperatorKey,
  buildHCS11Profile,
} from "@/lib/hcs-standards";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body;

  try {
    const client = getClient();

    switch (action) {
      case "create": {
        const { displayName, accountId, capabilities, model, bio } = req.body;
        // Create profile topic with submit key
        const operatorKey = getOperatorKey();
        const topicId = await createTopic(
          client,
          `hcs-11:profile:${accountId}`,
          operatorKey.publicKey
        );
        const msg = buildHCS11Profile(
          displayName,
          accountId,
          capabilities || [7, 9, 16],
          model || "oracle-v1",
          bio
        );
        const result = await submitMessage(client, topicId, msg);
        client.close();
        return res.json({ topicId, ...result });
      }

      case "read": {
        const { topicId } = req.body;
        client.close();
        const messages = await readTopicMessages(topicId);
        // Latest profile is the last message
        const profile = messages.length > 0 ? messages[messages.length - 1] : null;
        return res.json({ profile, messageCount: messages.length });
      }

      default:
        client.close();
        return res
          .status(400)
          .json({ error: "Invalid action. Use: create, read" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
