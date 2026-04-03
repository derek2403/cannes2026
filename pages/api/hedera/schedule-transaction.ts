import type { NextApiRequest, NextApiResponse } from "next";
import {
  ScheduleCreateTransaction,
  TransferTransaction,
  Hbar,
} from "@hashgraph/sdk";
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
    const { senderAccountId, receiverAccountId, amount = 1, memo = "" } = req.body;

    if (!senderAccountId || !receiverAccountId) {
      return res
        .status(400)
        .json({ error: "senderAccountId and receiverAccountId are required" });
    }

    // Build the transaction to schedule (an HBAR transfer)
    const transferTx = new TransferTransaction()
      .addHbarTransfer(senderAccountId, new Hbar(-amount))
      .addHbarTransfer(receiverAccountId, new Hbar(amount));

    // Wrap it in a scheduled transaction
    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(transferTx)
      .setScheduleMemo(memo || "Scheduled HBAR transfer");

    const txResponse = await scheduleTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const scheduleId = receipt.scheduleId;
    const scheduledTxId = receipt.scheduledTransactionId;

    client.close();

    return res.status(200).json({
      scheduleId: scheduleId?.toString(),
      scheduledTransactionId: scheduledTxId?.toString(),
      senderAccountId,
      receiverAccountId,
      amount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
