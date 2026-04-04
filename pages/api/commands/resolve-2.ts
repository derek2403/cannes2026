/**
 * POST /api/commands/resolve-2
 *
 * Phase 2: Discussion + Commit-Reveal (HCS-16 Flora pattern)
 *   Used when Phase 1 didn't reach 70% consensus.
 *
 *   1. Select committee (same weighted selection)
 *   2. DISCUSSION — Agents present views, then respond to each other
 *   3. PHASE 2 COMMIT — Each agent submits a sealed vote (hash)
 *   4. PHASE 2 REVEAL — All votes revealed & verified, tally
 *   5. If >=70% agree → resolve market + update reputation
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

  // ═══ DISCUSSION ROUND 1: Initial views ════════════════════════
  const initialViews: { agent: string; tokenId: number; view: string }[] = [];

  for (const agent of committee) {
    const result = await callAgent(
      baseUrl,
      agent.inftTokenId!,
      `Oracle dispute. Date: ${new Date().toISOString().split("T")[0]}.
Q: ${market.resolution.question}
In 2-3 sentences: your position (YES or NO), one key reason, one reference URL. Be brief.`,
      walletAddress
    );
    initialViews.push({
      agent: agent.displayName,
      tokenId: agent.inftTokenId!,
      view: result.response,
    });
  }
  phases.push({
    phase: "discussion_round_1",
    description: "Each agent presents their initial analysis",
    views: initialViews.map((v) => ({ agent: v.agent, view: v.view })),
  });

  // ═══ DISCUSSION ROUND 2: Agents respond to each other ════════
  const viewSummary = initialViews
    .map((v) => `[${v.agent}]: ${v.view}`)
    .join("\n\n---\n\n");

  const responses: { agent: string; response: string }[] = [];

  for (const agent of committee) {
    const result = await callAgent(
      baseUrl,
      agent.inftTokenId!,
      `Q: ${market.resolution.question}
Others said: ${viewSummary.slice(0, 800)}
In 2-3 sentences: agree or disagree with one agent by name, give one counter-point. Be brief.`,
      walletAddress
    );
    responses.push({
      agent: agent.displayName,
      response: result.response,
    });
  }
  phases.push({
    phase: "discussion_round_2",
    description: "Agents respond to each other's arguments",
    responses: responses.map((r) => ({ agent: r.agent, response: r.response })),
  });

  // ═══ PHASE 2 COMMIT ═══════════════════════════════════════════
  // After discussion, each agent votes independently with sealed commits.
  const discussionSummary = responses
    .map((r) => `[${r.agent}]: ${r.response}`)
    .join("\n\n---\n\n");

  const commits: CommitEntry[] = [];

  const commitPromises = committee.map(async (agent) => {
    const result = await callAgent(
      baseUrl,
      agent.inftTokenId!,
      `Q: ${market.resolution.question}
Discussion: ${discussionSummary.slice(0, 600)}
Final vote. One sentence reason, then end with: "FINAL VOTE: YES" or "FINAL VOTE: NO"`,
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

  phases.push({
    phase: "phase_2_commit",
    description: "Agents submitted sealed votes after discussion",
    commits: commits.map((c) => ({
      agent: c.agent,
      tokenId: c.tokenId,
      commitHash: c.commitHash,
    })),
  });

  // ═══ PHASE 2 REVEAL ═══════════════════════════════════════════
  const reveals: RevealEntry[] = commits.map((c) => {
    const verified = verifyCommit(c.vote, c.salt, c.commitHash);

    recordDisputeVote(
      c.agent,
      marketId,
      market.resolution.question,
      c.vote,
      "phase-2-reveal"
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

  // ── Tally ─────────────────────────────────────────────────────
  const tally = { YES: 0, NO: 0 };
  for (const v of reveals) {
    tally[v.vote]++;
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
    phase: "phase_2_reveal",
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

  // ── Update market + reputation if resolved ────────────────────
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
      reveals.map((v) => ({ agent: v.agent, vote: v.vote }))
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
    },
    consensus,
    resolved,
    reputationUpdates: resolved ? reputationUpdates : undefined,
    message: resolved
      ? `Market resolved as ${consensus} after discussion with ${Math.round(Math.max(yesPercent, noPercent) * 100)}% consensus`
      : `Still no consensus after Phase 2. YES: ${(yesPercent * 100).toFixed(0)}%, NO: ${(noPercent * 100).toFixed(0)}%.`,
    phases,
  });
}
