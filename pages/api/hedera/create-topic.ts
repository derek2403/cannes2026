import type { NextApiRequest, NextApiResponse } from "next";
import { TopicCreateTransaction } from "@hashgraph/sdk";
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
    const { memo = "Prediction Market Audit Log" } = req.body;

    const tx = new TopicCreateTransaction().setTopicMemo(memo);

    const txResponse = await tx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const topicId = receipt.topicId;

    client.close();

    return res.status(200).json({
      topicId: topicId?.toString(),
      memo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
