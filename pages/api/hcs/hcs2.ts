import type { NextApiRequest, NextApiResponse } from "next";
import { getClient } from "@/lib/hedera";
import {
  createTopic,
  submitMessage,
  readTopicMessages,
  getOperatorKey,
  buildHCS2Register,
  buildHCS2Update,
  buildHCS2Delete,
  computeHCS2State,
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
        // Indexed registry with 300s TTL, submit key for controlled writes
        const operatorKey = getOperatorKey();
        const topicId = await createTopic(
          client,
          "hcs-2:0:300",
          operatorKey.publicKey
        );
        client.close();
        return res.json({ topicId, memo: "hcs-2:0:300" });
      }

      case "register": {
        const { registryTopicId, entryTopicId, memo } = req.body;
        const msg = buildHCS2Register(entryTopicId, memo);
        const result = await submitMessage(client, registryTopicId, msg);
        client.close();
        return res.json({ registryTopicId, ...result });
      }

      case "update": {
        const { registryTopicId, uid, entryTopicId, memo } = req.body;
        const msg = buildHCS2Update(uid, entryTopicId, memo);
        const result = await submitMessage(client, registryTopicId, msg);
        client.close();
        return res.json({ registryTopicId, ...result });
      }

      case "delete": {
        const { registryTopicId, uid, memo } = req.body;
        const msg = buildHCS2Delete(uid, memo);
        const result = await submitMessage(client, registryTopicId, msg);
        client.close();
        return res.json({ registryTopicId, ...result });
      }

      case "read": {
        const { registryTopicId } = req.body;
        client.close();
        const messages = await readTopicMessages(registryTopicId);
        const entries = computeHCS2State(messages);
        return res.json({ entries, rawCount: messages.length });
      }

      default:
        client.close();
        return res
          .status(400)
          .json({ error: "Invalid action. Use: create, register, update, delete, read" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
