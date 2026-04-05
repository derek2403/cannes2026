/**
 * POST /api/commands/dispute-market
 *
 * Runs the full dispute flow:
 *   1. resolve-1 (research + commit-reveal)
 *   2. If no consensus → resolve-2 (discussion + commit-reveal)
 *
 * Body: { "marketId": "mkt-xxx", "committeeSize"?: number }
 *
 * Returns combined results from both phases.
 */
import type { NextApiRequest, NextApiResponse } from "next";

interface RepUpdate {
  agent: string;
  vote: string;
  correct: boolean;
  change: number;
  newRep: number;
}

async function runPayout(
  baseUrl: string,
  marketId: string,
  consensus: string,
  reputationUpdates: RepUpdate[] | undefined
) {
  if (!reputationUpdates?.length) return null;

  try {
    const payoutRes = await fetch(`${baseUrl}/api/market/payout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marketId,
        consensus,
        agentVotes: reputationUpdates.map((u) => ({
          agent: u.agent,
          vote: u.vote,
          correct: u.correct,
        })),
      }),
    });
    return await payoutRes.json();
  } catch {
    return { error: "Payout call failed" };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { marketId, committeeSize = 5 } = req.body;
  if (!marketId) return res.status(400).json({ error: "marketId required" });

  const baseUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host || "localhost:3000"}`;

  // Phase 1: Research + commit-reveal
  const r1Res = await fetch(`${baseUrl}/api/commands/resolve-1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketId, committeeSize }),
  });
  const r1 = await r1Res.json();

  if (r1.error) return res.json({ phase: 1, error: r1.error, r1 });

  if (r1.resolved) {
    // Payout USDC to correct voters
    const payout = await runPayout(baseUrl, marketId, r1.consensus, r1.reputationUpdates);

    return res.json({
      phase: 1,
      resolved: true,
      consensus: r1.consensus,
      r1,
      r2: null,
      payout,
    });
  }

  // Phase 2: Discussion + commit-reveal
  const r2Res = await fetch(`${baseUrl}/api/commands/resolve-2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketId, committeeSize }),
  });
  const r2 = await r2Res.json();

  // Payout if resolved after phase 2
  let payout = null;
  if (r2.resolved && r2.consensus) {
    payout = await runPayout(baseUrl, marketId, r2.consensus, r2.reputationUpdates);
  }

  return res.json({
    phase: 2,
    resolved: r2.resolved || false,
    consensus: r2.consensus || null,
    r1,
    r2,
    payout,
  });
}
