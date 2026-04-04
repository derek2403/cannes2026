/**
 * POST /api/commands/resolve-1
 *
 * Phase 1: Commit-Reveal independent vote (HCS-16 Flora pattern)
 *   1. Select reputation-weighted committee
 *   2. COMMIT — Each agent researches independently, votes sealed (hash)
 *   3. REVEAL — All votes revealed & verified against hashes, tally
 *   4. If >=70% agree → resolve market + update reputation
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
  generateSalt,
  computeCommitHash,
  verifyCommit,
  type CommitEntry,
  type RevealEntry,
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

  const { marketId, committeeSize = 1 } = req.body;
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

  const phases: Record<string, unknown>[] = [];

  // ═══ PHASE 1 COMMIT ═══════════════════════════════════════════
  // Each agent researches independently and submits a sealed vote.
  // Votes are hashed with a random salt — no agent sees others' votes.
  const commits: CommitEntry[] = [];

  const commitPromises = committee.map(async (agent) => {
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
    const salt = generateSalt();
    const commitHash = computeCommitHash(vote, salt);

    return {
      agent: agent.displayName,
      tokenId: agent.inftTokenId!,
      commitHash,
      salt,
      vote,
      reasoning: result.response,
    };
  });

  const commitResults = await Promise.all(commitPromises);
  commits.push(...commitResults);

  // Phase output: only show commit hashes (votes are sealed)
  phases.push({
    phase: "phase_1_commit",
    description: "Agents researched independently and submitted sealed votes",
    commits: commits.map((c) => ({
      agent: c.agent,
      tokenId: c.tokenId,
      commitHash: c.commitHash,
    })),
  });

  // ═══ PHASE 1 REVEAL ═══════════════════════════════════════════
  // All votes revealed simultaneously and verified against hashes.
  const reveals: RevealEntry[] = commits.map((c) => {
    const verified = verifyCommit(c.vote, c.salt, c.commitHash);

    // Record the vote in history
    recordDisputeVote(
      c.agent,
      marketId,
      market.resolution.question,
      c.vote,
      "phase-1-reveal"
    );

    return {
      agent: c.agent,
      tokenId: c.tokenId,
      vote: c.vote,
      salt: c.salt,
      commitHash: c.commitHash,
      verified,
      reasoning: c.reasoning,
    };
  });

  // ── Tally votes ───────────────────────────────────────────────
  const tally = { YES: 0, NO: 0, UNSURE: 0 };
  for (const r of reveals) {
    tally[r.vote]++;
  }

  const totalVoters = reveals.length;
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

  phases.push({
    phase: "phase_1_reveal",
    description: "Votes revealed and verified against commit hashes",
    reveals: reveals.map((r) => ({
      agent: r.agent,
      vote: r.vote,
      commitHash: r.commitHash,
      salt: r.salt,
      verified: r.verified,
    })),
    tally,
  });

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
      reveals.map((r) => ({ agent: r.agent, vote: r.vote }))
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
      : `No consensus reached (need 70%). YES: ${(yesPercent * 100).toFixed(0)}%, NO: ${(noPercent * 100).toFixed(0)}%. Use /api/commands/resolve-2 for discussion + Phase 2 commit-reveal.`,
    phases,
  });
}
