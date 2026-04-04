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
    return res.json({
      phase: 1,
      resolved: true,
      consensus: r1.consensus,
      r1,
      r2: null,
    });
  }

  // Phase 2: Discussion + commit-reveal
  const r2Res = await fetch(`${baseUrl}/api/commands/resolve-2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketId, committeeSize }),
  });
  const r2 = await r2Res.json();

  return res.json({
    phase: 2,
    resolved: r2.resolved || false,
    consensus: r2.consensus || null,
    r1,
    r2,
  });
}
