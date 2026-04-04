/**
 * POST /api/commands/resolve-1
 *
 * Independent research + vote resolution.
 *   1. Fetch agents + reputation scores
 *   2. Select committee weighted by reputation
 *   3. Each selected agent researches independently, votes YES/NO
 *   4. If >=70% agree → resolve + update reputation
 *
 * Body: { "marketId": "...", "committeeSize": 3 }
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getMintedAgents,
  getBaseUrl,
  callAgent,
  getWalletAddress,
  extractVote,
  selectCommittee,
  updateReputation,
  recordDisputeVote,
} from "@/lib/agent-helpers";

const MARKETS_FILE = join(process.cwd(), "data", "markets.json");

interface Market {
  id: string;
  resolution: { question: string; resolution_criteria: string };
  ux: { status: string };
  settlement: {
    winning_outcome: string | null;
    settlement_price: number | null;
  };
  [key: string]: unknown;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { marketId, committeeSize = 3 } = req.body;
  if (!marketId) {
    return res.status(400).json({ error: "marketId is required" });
  }

  let markets: Market[] = [];
  try {
    markets = JSON.parse(readFileSync(MARKETS_FILE, "utf-8"));
  } catch {
    return res.status(500).json({ error: "Could not read markets.json" });
  }

  const market = markets.find((m) => m.id === marketId);
  if (!market) {
    return res.status(404).json({ error: `Market ${marketId} not found` });
  }

  const allAgents = getMintedAgents();
  if (allAgents.length === 0) {
    return res.status(400).json({ error: "No minted agents found" });
  }

  // ── Select committee weighted by reputation ───────────────────
  const committee = selectCommittee(allAgents, committeeSize);

  const baseUrl = getBaseUrl(req);
  let walletAddress: string;
  try {
    walletAddress = await getWalletAddress(baseUrl);
  } catch (err: unknown) {
    return res.status(500).json({
      error: `Failed to get wallet: ${err instanceof Error ? err.message : err}`,
    });
  }

  // ── Each committee member researches independently ────────────
  const agentResults: {
    agent: string;
    tokenId: number;
    reputation: number;
    vote: "YES" | "NO" | "UNSURE";
    reasoning: string;
  }[] = [];

  const researchPromises = committee.map(async (agent) => {
    const result = await callAgent(
      baseUrl,
      agent.inftTokenId!,
      `You are an oracle agent resolving a prediction market.

MARKET QUESTION: ${market.resolution.question}

RESOLUTION CRITERIA: ${market.resolution.resolution_criteria}

Research this question independently. Consider all available evidence.
You MUST provide a clear vote: YES or NO.

Structure your response:
1. Key evidence found
2. Analysis of evidence
3. Your vote: YES or NO (state clearly)

Be concise. End with "My vote: YES" or "My vote: NO".`,
      walletAddress
    );

    const vote = extractVote(result.response);

    // Record the vote in history
    recordDisputeVote(
      agent.displayName,
      marketId,
      market.resolution.question,
      vote,
      "resolve-1"
    );

    return {
      agent: agent.displayName,
      tokenId: agent.inftTokenId!,
      reputation: agent.reputation ?? 10,
      vote,
      reasoning: result.response,
    };
  });

  const results = await Promise.all(researchPromises);
  agentResults.push(...results);

  // ── Tally votes ───────────────────────────────────────────────
  const tally = { YES: 0, NO: 0, UNSURE: 0 };
  for (const r of agentResults) {
    tally[r.vote]++;
  }

  const totalVoters = agentResults.length;
  const yesPercent = totalVoters > 0 ? tally.YES / totalVoters : 0;
  const noPercent = totalVoters > 0 ? tally.NO / totalVoters : 0;

  let consensus: "YES" | "NO" | null = null;
  let resolved = false;

  if (yesPercent >= 0.7) {
    consensus = "YES";
    resolved = true;
  } else if (noPercent >= 0.7) {
    consensus = "NO";
    resolved = true;
  }

  // ── If resolved: update market + update reputation ────────────
  let reputationUpdates: {
    agent: string;
    vote: string;
    correct: boolean;
    change: number;
    newRep: number;
  }[] = [];

  if (resolved && consensus) {
    const idx = markets.findIndex((m) => m.id === marketId);
    if (idx >= 0) {
      markets[idx].ux.status = "RESOLVED";
      markets[idx].settlement.winning_outcome = consensus;
      markets[idx].settlement.settlement_price =
        consensus === "YES" ? 0.95 : 0.05;
      writeFileSync(MARKETS_FILE, JSON.stringify(markets, null, 2));
    }

    reputationUpdates = updateReputation(
      marketId,
      market.resolution.question,
      consensus,
      agentResults.map((r) => ({ agent: r.agent, vote: r.vote }))
    );
  }

  return res.json({
    success: true,
    marketId,
    question: market.resolution.question,
    committee: committee.map((a) => ({
      name: a.displayName,
      tokenId: a.inftTokenId,
      reputation: a.reputation ?? 10,
    })),
    tally,
    percentages: {
      YES: `${(yesPercent * 100).toFixed(0)}%`,
      NO: `${(noPercent * 100).toFixed(0)}%`,
      UNSURE: `${((tally.UNSURE / totalVoters) * 100).toFixed(0)}%`,
    },
    consensus,
    resolved,
    reputationUpdates: resolved ? reputationUpdates : undefined,
    message: resolved
      ? `Market resolved as ${consensus} with ${Math.round(Math.max(yesPercent, noPercent) * 100)}% consensus`
      : `No consensus reached (need 70%). YES: ${(yesPercent * 100).toFixed(0)}%, NO: ${(noPercent * 100).toFixed(0)}%. Use /api/commands/resolve-2 for discussion round.`,
    agents: agentResults,
  });
}
