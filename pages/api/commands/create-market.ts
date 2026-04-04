/**
 * POST /api/commands/create-market
 *
 * 3-stage AI-driven market creation:
 *   Stage 1 — Proposal: Each agent proposes a prediction market topic
 *   Stage 2 — Discussion: Agents discuss and evaluate proposals
 *   Stage 3 — Decision: Agents vote on the best market to create
 *
 * The winning market is added to data/markets.json.
 *
 * Example:
 *   curl -X POST http://localhost:3000/api/commands/create-market \
 *     -H "Content-Type: application/json" \
 *     -d '{ "theme": "crypto and AI regulation in 2026" }'
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getMintedAgents,
  getBaseUrl,
  callAgent,
  getWalletAddress,
  recordMarketCreation,
} from "@/lib/agent-helpers";

const MARKETS_FILE = join(process.cwd(), "data", "markets.json");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { theme = "current events" } = req.body;

  const agents = getMintedAgents();
  if (agents.length === 0) {
    return res.status(400).json({ error: "No minted agents found. Create agents first." });
  }

  const baseUrl = getBaseUrl(req);
  let walletAddress: string;
  try {
    walletAddress = await getWalletAddress(baseUrl);
  } catch (err: unknown) {
    return res.status(500).json({
      error: `Failed to get wallet: ${err instanceof Error ? err.message : err}`,
    });
  }

  const stages: Record<string, unknown>[] = [];

  // ── Stage 1: Proposal ─────────────────────────────────────────
  const proposals: { agent: string; tokenId: number; proposal: string }[] = [];

  const proposalPromises = agents.map(async (agent) => {
    const result = await callAgent(
      baseUrl,
      agent.inftTokenId!,
      `You are participating in a prediction market creation process. The theme is: "${theme}".

Propose ONE specific prediction market question that:
- Is binary (YES/NO resolvable)
- Has a clear resolution date (within 6 months)
- Is interesting and tradeable
- Has clear resolution criteria

Format your response as JSON:
{"question": "...", "resolution_date": "YYYY-MM-DD", "resolution_criteria": "..."}`,
      walletAddress
    );
    return {
      agent: agent.displayName,
      tokenId: agent.inftTokenId!,
      proposal: result.response,
    };
  });

  const proposalResults = await Promise.all(proposalPromises);
  proposals.push(...proposalResults);
  stages.push({ stage: "proposal", proposals });

  // ── Stage 2: Discussion ───────────────────────────────────────
  const proposalSummary = proposals
    .map((p, i) => `[${i + 1}] ${p.agent}: ${p.proposal}`)
    .join("\n\n");

  const discussions: { agent: string; discussion: string }[] = [];

  const discussionPromises = agents.map(async (agent) => {
    const result = await callAgent(
      baseUrl,
      agent.inftTokenId!,
      `Here are the proposed prediction markets from all agents:

${proposalSummary}

Evaluate these proposals. Consider:
- Which question is most interesting for traders?
- Which has the clearest resolution criteria?
- Which is most timely and relevant?

Pick your TOP choice (by number) and explain why. Also note any proposals that are flawed or unclear.

Format: "My pick: [number]. Reason: ..."`,
      walletAddress
    );
    return {
      agent: agent.displayName,
      discussion: result.response,
    };
  });

  const discussionResults = await Promise.all(discussionPromises);
  discussions.push(...discussionResults);
  stages.push({ stage: "discussion", discussions });

  // ── Stage 3: Decision ─────────────────────────────────────────
  // Tally votes from discussion
  const votes: Record<number, number> = {};
  for (const d of discussions) {
    const match = d.discussion.match(/My pick:\s*\[?(\d+)\]?/i)
      || d.discussion.match(/pick(?:ed)?(?:\s+is)?(?:\s+number)?\s*\[?(\d+)\]?/i)
      || d.discussion.match(/\[(\d+)\]/);
    if (match) {
      const pick = parseInt(match[1]);
      votes[pick] = (votes[pick] || 0) + 1;
    }
  }

  // Find winner
  let winnerIdx = 1;
  let maxVotes = 0;
  for (const [idx, count] of Object.entries(votes)) {
    if (count > maxVotes) {
      maxVotes = count;
      winnerIdx = parseInt(idx);
    }
  }

  const winningProposal = proposals[winnerIdx - 1] || proposals[0];

  // Parse the winning proposal's JSON
  let marketQuestion = theme;
  let resolutionDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  let resolutionCriteria = "";

  try {
    const jsonMatch = winningProposal.proposal.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      marketQuestion = parsed.question || marketQuestion;
      resolutionDate = parsed.resolution_date || resolutionDate;
      resolutionCriteria = parsed.resolution_criteria || "";
    }
  } catch {
    // Use raw proposal text as question
    marketQuestion = winningProposal.proposal.slice(0, 200);
  }

  // Create market entry
  const marketId = `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newMarket = {
    id: marketId,
    created_at: new Date().toISOString(),
    ai_insight: {
      agent_id: winningProposal.agent,
      debate_log_id: `debate-${marketId}`,
      market_thesis: `Market proposed by ${winningProposal.agent} during AI swarm creation process on theme: ${theme}`,
      confidence_score: Math.round((maxVotes / agents.length) * 100),
      suggested_categories: [theme.split(" ")[0]],
      news_sources: [],
    },
    resolution: {
      question: marketQuestion,
      resolution_criteria: resolutionCriteria ||
        `Resolved by AI oracle swarm consensus. ${agents.length} agents participate in commit-reveal voting.`,
      resolution_date: resolutionDate,
      oracle_type: "ai_swarm",
      ancillary_data: `Created via /api/commands/create-market with ${agents.length} agents`,
    },
    amm: {
      lp_pool_address: null,
      initial_seed_amount: 1000,
      yes_token_id: null,
      no_token_id: null,
      yes_token_balance: 1000,
      no_token_balance: 1000,
      current_odds_yes: 0.5,
      total_liquidity_usd: 0,
      trading_fee: 0.02,
    },
    ux: {
      status: "PROPOSED",
      volume_24h: 0,
      total_volume: 0,
      unique_bettors: 0,
      top_bet_size: 0,
      is_trending: false,
    },
    settlement: {
      winning_outcome: null,
      settlement_price: null,
      dispute_tx_hash: null,
    },
  };

  // Add to markets.json
  let markets: unknown[] = [];
  try {
    markets = JSON.parse(readFileSync(MARKETS_FILE, "utf-8"));
  } catch {
    /* empty */
  }
  markets.push(newMarket);
  writeFileSync(MARKETS_FILE, JSON.stringify(markets, null, 2));

  // Record market creation history for all participating agents
  for (const p of proposals) {
    const isWinner = p.agent === winningProposal.agent;
    recordMarketCreation(
      p.agent,
      marketId,
      marketQuestion,
      isWinner ? "proposer" : "participant"
    );
  }

  stages.push({
    stage: "decision",
    votes,
    winner: {
      proposalIndex: winnerIdx,
      agent: winningProposal.agent,
      votesReceived: maxVotes,
      totalAgents: agents.length,
    },
    market: newMarket,
  });

  return res.json({
    success: true,
    marketId,
    question: marketQuestion,
    stages,
  });
}
