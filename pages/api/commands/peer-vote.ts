/**
 * POST /api/commands/peer-vote
 *
 * Each agent rates every other agent's reliability (0-10).
 * Body: { "marketId"?: string }
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  getMintedAgents,
  getBaseUrl,
  callAgent,
  getWalletAddress,
} from "@/lib/agent-helpers";

const SESSIONS_DIR = join(process.cwd(), "data", "sessions");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { marketId } = req.body;
  const agents = getMintedAgents();
  if (agents.length < 2) return res.status(400).json({ error: "Need at least 2 agents" });

  const baseUrl = getBaseUrl(req);
  let walletAddress: string;
  try { walletAddress = await getWalletAddress(baseUrl); } catch (err: unknown) {
    return res.status(500).json({ error: `Wallet: ${err instanceof Error ? err.message : err}` });
  }

  const results: { agent: string; ratings: Record<string, number>; raw: string }[] = [];

  for (const agent of agents) {
    const others = agents.filter(a => a.displayName !== agent.displayName).map(a => a.displayName);

    const result = await callAgent(baseUrl, agent.inftTokenId!,
      `You are ${agent.displayName}. Rate each agent's reliability from 0-10.
Consider: quality of evidence, accuracy, consistency, contribution to consensus.
${marketId ? `Context: market ${marketId}` : ''}

Agents to rate: ${others.join(", ")}

Reply with ONLY a JSON object: {"AgentName": score, ...}
Each score must be 0-10. One entry per agent.`, walletAddress);

    let ratings: Record<string, number> = {};
    try {
      const m = result.response.match(/\{[\s\S]*\}/);
      if (m) ratings = JSON.parse(m[0]);
    } catch { /* */ }

    results.push({ agent: agent.displayName, ratings, raw: result.response });
  }

  // Compute average ratings per agent
  const avgRatings: Record<string, { total: number; count: number; avg: number }> = {};
  for (const r of results) {
    for (const [name, score] of Object.entries(r.ratings)) {
      if (typeof score !== "number") continue;
      if (!avgRatings[name]) avgRatings[name] = { total: 0, count: 0, avg: 0 };
      avgRatings[name].total += score;
      avgRatings[name].count++;
    }
  }
  for (const name of Object.keys(avgRatings)) {
    avgRatings[name].avg = Math.round((avgRatings[name].total / avgRatings[name].count) * 10) / 10;
  }

  // Save to sessions dir
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
  const voteId = `peer-vote-${Date.now()}`;
  writeFileSync(join(SESSIONS_DIR, `${voteId}.json`), JSON.stringify({ voteId, marketId, results, avgRatings, timestamp: new Date().toISOString() }, null, 2));

  return res.json({
    success: true,
    voteId,
    marketId,
    votes: results.map(r => ({ agent: r.agent, ratings: r.ratings })),
    avgRatings,
    ranking: Object.entries(avgRatings).sort((a, b) => b[1].avg - a[1].avg).map(([name, data]) => ({ agent: name, avgScore: data.avg })),
  });
}
