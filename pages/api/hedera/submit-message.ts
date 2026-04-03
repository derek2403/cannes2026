import type { NextApiRequest, NextApiResponse } from "next";
import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = getClient();
    const { topicId, message } = req.body;

    if (!topicId || !message) {
      return res.status(400).json({ error: "topicId and message are required" });
    }

    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message);

    const txResponse = await tx.execute(client);
    const receipt = await txResponse.getReceipt(client);

    client.close();

    return res.status(200).json({
      status: receipt.status.toString(),
      topicId,
      topicSequenceNumber: receipt.topicSequenceNumber?.toString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
