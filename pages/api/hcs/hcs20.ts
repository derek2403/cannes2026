import type { NextApiRequest, NextApiResponse } from "next";
import { getClient } from "@/lib/hedera";
import {
  createTopic,
  submitMessage,
  readTopicMessages,
  getOperatorKey,
  buildHCS20Deploy,
  buildHCS20Mint,
  buildHCS20Burn,
  buildHCS20Transfer,
  computeHCS20Balances,
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
      case "deploy": {
        const { name, tick, max, lim } = req.body;
        // Private mode: create topic with submit key
        const operatorKey = getOperatorKey();
        const topicId = await createTopic(
          client,
          `hcs-20`,
          operatorKey.publicKey
        );
        const msg = buildHCS20Deploy(name, tick, max, lim);
        const result = await submitMessage(client, topicId, msg);
        client.close();
        return res.json({ topicId, ...result, deployed: { name, tick, max, lim } });
      }

      case "mint": {
        const { topicId, tick, amt, to, memo } = req.body;
        const msg = buildHCS20Mint(tick, amt, to, memo);
        const result = await submitMessage(client, topicId, msg);
        client.close();
        return res.json({ topicId, ...result });
      }

      case "burn": {
        const { topicId, tick, amt, from, memo } = req.body;
        const msg = buildHCS20Burn(tick, amt, from, memo);
        const result = await submitMessage(client, topicId, msg);
        client.close();
        return res.json({ topicId, ...result });
      }

      case "transfer": {
        const { topicId, tick, amt, from, to, memo } = req.body;
        const msg = buildHCS20Transfer(tick, amt, from, to, memo);
        const result = await submitMessage(client, topicId, msg);
        client.close();
        return res.json({ topicId, ...result });
      }

      case "balance": {
        const { topicId } = req.body;
        client.close();
        const messages = await readTopicMessages(topicId);
        const state = computeHCS20Balances(messages);
        return res.json(state);
      }

      default:
        client.close();
        return res
          .status(400)
          .json({ error: "Invalid action. Use: deploy, mint, burn, transfer, balance" });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
