/**
 * POST /api/x402/subscribe
 *
 * Create a recurring x402 subscription backed by Hedera scheduled transactions.
 *
 * On subscribe: creates the first ScheduleCreateTransaction (HBAR payment).
 * On every poll:  if >=10 s since last payment, auto-creates a new one.
 *
 * This means each 10-second polling interval produces a real Hedera scheduled
 * transaction on-chain — visible on HashScan as a chain of schedule IDs.
 *
 * Body: {
 *   payer_account_id: "0.0.xxxxx",
 *   duration_minutes?: number   (default 10),
 *   interval_seconds?: number   (default 10)
 * }
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  ScheduleCreateTransaction,
  TransferTransaction,
  Hbar,
} from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";
import { randomBytes } from "crypto";

const SUBS_PATH = join(process.cwd(), "data", "x402-subscriptions.json");
const OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || "0.0.7946371";
const HBAR_PER_PAYMENT = 1; // 1 HBAR per scheduled tx

export interface ScheduleEntry {
  schedule_id: string;
  scheduled_tx_id: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  payer_account_id: string;
  created_at: string;
  expires_at: string;
  duration_minutes: number;
  interval_seconds: number;
  last_payment_at: string;
  total_hbar_paid: number;
  total_scheduled_txs: number;
  status: "active" | "expired";
  schedules: ScheduleEntry[];
}

export function readSubs(): { subscriptions: Subscription[] } {
  if (!existsSync(SUBS_PATH)) return { subscriptions: [] };
  return JSON.parse(readFileSync(SUBS_PATH, "utf-8"));
}

export function saveSubs(data: { subscriptions: Subscription[] }) {
  writeFileSync(SUBS_PATH, JSON.stringify(data, null, 2));
}

/** Create a Hedera ScheduleCreateTransaction for the subscription payment */
export async function createScheduledPayment(
  payerAccountId: string,
  memo: string
): Promise<{ scheduleId: string; scheduledTxId: string }> {
  const client = getClient();
  try {
    const transferTx = new TransferTransaction()
      .addHbarTransfer(payerAccountId, new Hbar(-HBAR_PER_PAYMENT))
      .addHbarTransfer(OPERATOR_ID, new Hbar(HBAR_PER_PAYMENT));

    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(transferTx)
      .setScheduleMemo(memo);

    const txResponse = await scheduleTx.execute(client);
    const receipt = await txResponse.getReceipt(client);

    return {
      scheduleId: receipt.scheduleId?.toString() || "",
      scheduledTxId: receipt.scheduledTransactionId?.toString() || "",
    };
  } finally {
    client.close();
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  const {
    payer_account_id,
    duration_minutes = 10,
    interval_seconds = 10,
  } = req.body;

  if (!payer_account_id) {
    return res.status(400).json({
      error: "payer_account_id required",
      example: {
        payer_account_id: "0.0.12345",
        duration_minutes: 10,
        interval_seconds: 10,
      },
    });
  }

  try {
    // First scheduled payment
    const memo = `x402 | ${payer_account_id} | #1 | ${Date.now()}`;
    const { scheduleId, scheduledTxId } = await createScheduledPayment(
      payer_account_id,
      memo
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration_minutes * 60_000);
    const subId = `sub-${randomBytes(8).toString("hex")}`;

    const subs = readSubs();
    const newSub: Subscription = {
      id: subId,
      payer_account_id,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      duration_minutes,
      interval_seconds,
      last_payment_at: now.toISOString(),
      total_hbar_paid: HBAR_PER_PAYMENT,
      total_scheduled_txs: 1,
      status: "active",
      schedules: [
        {
          schedule_id: scheduleId,
          scheduled_tx_id: scheduledTxId,
          created_at: now.toISOString(),
        },
      ],
    };
    subs.subscriptions.push(newSub);
    saveSubs(subs);

    const baseUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

    return res.json({
      success: true,
      subscription_id: subId,
      payer_account_id,
      duration_minutes,
      interval_seconds,
      expires_at: expiresAt.toISOString(),
      initial_schedule: {
        schedule_id: scheduleId,
        scheduled_tx_id: scheduledTxId,
        explorer: `https://hashscan.io/testnet/schedule/${scheduleId}`,
      },
      note: `A new ScheduleCreateTransaction will be created every ${interval_seconds}s on each poll.`,
      access: {
        url: `${baseUrl}/api/x402/news`,
        header: `X-Subscription-Id: ${subId}`,
        curl: `curl -X GET "${baseUrl}/api/x402/news" -H "X-Subscription-Id: ${subId}"`,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
