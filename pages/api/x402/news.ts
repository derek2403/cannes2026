/**
 * GET /api/x402/news
 *
 * x402-protected prediction market data feed.
 *
 * Two payment paths (middleware.ts decides):
 *   A) x402 protocol — USDC on Base Sepolia via PAYMENT-SIGNATURE header
 *   B) Hedera subscription — X-Subscription-Id header, creates a new
 *      ScheduleCreateTransaction every interval_seconds (default 10s)
 *
 * If you reach this handler, payment has already been verified (path A)
 * or the subscription is active (path B). For path B, this handler
 * auto-creates the next Hedera scheduled tx if the interval has elapsed.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  readSubs,
  saveSubs,
  createScheduledPayment,
  type Subscription,
} from "./subscribe";

const MARKETS_FILE = join(process.cwd(), "data", "markets.json");
const HISTORY_FILE = join(process.cwd(), "data", "agent-history.json");
const STATE_PATH = join(process.cwd(), "hedera-state.json");

function readJson(path: string) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function buildFeed() {
  const markets = readJson(MARKETS_FILE) || [];
  const history = readJson(HISTORY_FILE) || { events: [] };
  const state = readJson(STATE_PATH) || {};

  const oracleEvents = history.events
    .filter((e: { type: string }) =>
      ["reputation_change", "usdc_payout"].includes(e.type)
    )
    .slice(-20);

  const agents = (state.agents || []).map(
    (a: { displayName: string; accountId: string }) => ({
      name: a.displayName,
      accountId: a.accountId,
    })
  );

  return {
    timestamp: new Date().toISOString(),
    protocol: "x402",
    network: "eip155:84532",
    markets: markets.map(
      (m: {
        id: string;
        resolution: { question: string; resolution_date: string };
        ux: { status: string };
        settlement: { winning_outcome: string | null };
        amm: { current_odds_yes: number };
      }) => ({
        id: m.id,
        question: m.resolution.question,
        status: m.ux.status,
        resolution_date: m.resolution.resolution_date,
        winning_outcome: m.settlement?.winning_outcome || null,
        odds_yes: m.amm.current_odds_yes,
      })
    ),
    oracle_activity: oracleEvents,
    agents,
    total_markets: markets.length,
    total_agents: agents.length,
  };
}

/**
 * If subscription interval has elapsed, create a new Hedera
 * ScheduleCreateTransaction and record it in the subscription.
 */
async function maybeCreateNextScheduledTx(sub: Subscription) {
  const now = Date.now();
  const lastPayment = new Date(sub.last_payment_at).getTime();
  const intervalMs = (sub.interval_seconds || 10) * 1000;

  if (now - lastPayment < intervalMs) {
    // Not time yet
    return null;
  }

  const txNum = sub.total_scheduled_txs + 1;
  const memo = `x402 | ${sub.payer_account_id} | #${txNum} | ${now}`;

  const { scheduleId, scheduledTxId } = await createScheduledPayment(
    sub.payer_account_id,
    memo
  );

  // Update subscription state
  const subs = readSubs();
  const entry = subs.subscriptions.find((s) => s.id === sub.id);
  if (entry) {
    entry.last_payment_at = new Date(now).toISOString();
    entry.total_hbar_paid += 1;
    entry.total_scheduled_txs = txNum;
    entry.schedules.push({
      schedule_id: scheduleId,
      scheduled_tx_id: scheduledTxId,
      created_at: new Date(now).toISOString(),
    });
    saveSubs(subs);
  }

  return {
    schedule_id: scheduleId,
    scheduled_tx_id: scheduledTxId,
    tx_number: txNum,
    explorer: `https://hashscan.io/testnet/schedule/${scheduleId}`,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const subId =
    (req.headers["x-subscription-id"] as string) ||
    (req.query.sub as string) ||
    null;

  let payment = null;

  // If subscription-based access, auto-create next Hedera scheduled tx
  if (subId) {
    const subs = readSubs();
    const sub = subs.subscriptions.find((s) => s.id === subId);

    if (sub && new Date(sub.expires_at) > new Date()) {
      try {
        payment = await maybeCreateNextScheduledTx(sub);
      } catch {
        // Scheduled tx creation failed — still return data
        payment = { error: "Failed to create next scheduled tx" };
      }
    }
  }

  const feed = buildFeed();

  return res.json({
    ...feed,
    payment: payment || undefined,
  });
}
