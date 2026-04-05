/**
 * POST /api/commands/run-session
 *
 * Runs a complete prediction market session:
 *   1. Create Market — agents propose, discuss, decide
 *   2. Resolve Phase 1 — independent research + commit-reveal vote
 *   3. Resolve Phase 2 — discussion + commit-reveal vote (if no consensus)
 *   4. Peer Vote — agents rate each other's reliability (0-10)
 *
 * All transcripts recorded per-agent in data/sessions/
 *
 * Body: { "theme"?: string, "committeeSize"?: number, "sessionId"?: string }
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import {
  getMintedAgents,
  getBaseUrl,
  callAgent,
  getWalletAddress,
  extractVote,
  selectCommittee,
  updateReputation,
  recordMarketCreation,
  recordDisputeVote,
  generateSalt,
  computeCommitHash,
  verifyCommit,
} from "@/lib/agent-helpers";

const MARKETS_FILE = join(process.cwd(), "data", "markets.json");
const SESSIONS_DIR = join(process.cwd(), "data", "sessions");

interface AgentTranscript {
  agentName: string;
  tokenId: number;
  reputation: number;
  // Phase 1: Create Market
  proposedMarket: string;
  opinionOnOthers: string;
  finalMarketDecision: string;
  // Phase 2: Resolve (self research)
  selfResearch: string;
  researchReferences: string[];
  researchVote: string;
  // Phase 3: Resolve (discussion)
  currentView: string;
  criticismOfOthers: string;
  proofAndReferences: string;
  discussionFinalVote: string;
  // Phase 4: Peer vote
  peerRatings: Record<string, number>;
}

interface SessionRecord {
  sessionId: string;
  startedAt: string;
  completedAt?: string;
  theme: string;
  marketId?: string;
  marketQuestion?: string;
  phase1Result?: { tally: Record<string, number>; consensus: string | null; resolved: boolean };
  phase2Result?: { tally: Record<string, number>; consensus: string | null; resolved: boolean };
  finalOutcome?: string;
  reputationUpdates?: { agent: string; change: number; newRep: number }[];
  transcripts: AgentTranscript[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { theme = "current events and technology", committeeSize = 3, sessionId: inputSessionId } = req.body;
  const sessionId = inputSessionId || `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const agents = getMintedAgents();
  if (agents.length < 2) return res.status(400).json({ error: "Need at least 2 minted agents" });

  const baseUrl = getBaseUrl(req);
  let walletAddress: string;
  try { walletAddress = await getWalletAddress(baseUrl); } catch (err: unknown) {
    return res.status(500).json({ error: `Wallet: ${err instanceof Error ? err.message : err}` });
  }

  // Ensure sessions dir
  if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });

  const today = new Date().toISOString().split("T")[0];
  const transcripts: AgentTranscript[] = agents.map(a => ({
    agentName: a.displayName, tokenId: a.inftTokenId!, reputation: a.reputation ?? 10,
    proposedMarket: "", opinionOnOthers: "", finalMarketDecision: "",
    selfResearch: "", researchReferences: [], researchVote: "",
    currentView: "", criticismOfOthers: "", proofAndReferences: "", discussionFinalVote: "",
    peerRatings: {},
  }));

  const session: SessionRecord = {
    sessionId, startedAt: new Date().toISOString(), theme, transcripts,
  };

  const save = () => writeFileSync(join(SESSIONS_DIR, `${sessionId}.json`), JSON.stringify(session, null, 2));

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: CREATE MARKET
  // ═══════════════════════════════════════════════════════════

  // 1a. Each agent proposes a market
  for (let i = 0; i < agents.length; i++) {
    const result = await callAgent(baseUrl, agents[i].inftTokenId!,
      `You are ${agents[i].displayName}. Today is ${today}. Theme: "${theme}".
Propose ONE binary (YES/NO) prediction market. It must be resolvable within 6 months (2026+), cite real references.
Format as JSON: {"question":"...","resolution_date":"YYYY-MM-DD","resolution_criteria":"...","references":["url1","url2"]}`, walletAddress);
    transcripts[i].proposedMarket = result.response;
  }

  // 1b. Each agent reviews others' proposals
  const proposalSummary = transcripts.map((t, i) => `[${i + 1}] ${t.agentName}: ${t.proposedMarket}`).join("\n\n");
  for (let i = 0; i < agents.length; i++) {
    const result = await callAgent(baseUrl, agents[i].inftTokenId!,
      `You are ${agents[i].displayName}. Review these market proposals:
${proposalSummary}
For each proposal: Is the question clear? Are dates correct (2026+)? Are references valid?
Pick your top choice by number and explain why. Note any flawed proposals.`, walletAddress);
    transcripts[i].opinionOnOthers = result.response;
  }

  // 1c. Final decision — vote on best market
  const opinionsSummary = transcripts.map(t => `[${t.agentName}]: ${t.opinionOnOthers}`).join("\n\n");
  const marketVotes: Record<number, number> = {};
  for (let i = 0; i < agents.length; i++) {
    const result = await callAgent(baseUrl, agents[i].inftTokenId!,
      `You are ${agents[i].displayName}. Final vote. Pick the BEST market proposal.
Proposals: ${proposalSummary}
Opinions: ${opinionsSummary}
Reply with ONLY JSON: {"pick":NUMBER,"reason":"..."}`, walletAddress);
    transcripts[i].finalMarketDecision = result.response;
    try {
      const m = result.response.match(/\{[\s\S]*\}/);
      if (m) { const p = JSON.parse(m[0]); marketVotes[p.pick] = (marketVotes[p.pick] || 0) + 1; }
    } catch { /* */ }
  }

  // Determine winning market
  let winnerIdx = 1, maxVotes = 0;
  for (const [idx, count] of Object.entries(marketVotes)) {
    if (count > maxVotes) { maxVotes = count; winnerIdx = parseInt(idx); }
  }
  const winningProposal = transcripts[(winnerIdx - 1)] || transcripts[0];
  let marketQuestion = theme;
  let resolutionDate = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
  let resolutionCriteria = "";
  try {
    const jm = winningProposal.proposedMarket.match(/\{[\s\S]*\}/);
    if (jm) { const p = JSON.parse(jm[0]); marketQuestion = p.question || marketQuestion; resolutionDate = p.resolution_date || resolutionDate; resolutionCriteria = p.resolution_criteria || ""; }
  } catch { marketQuestion = winningProposal.proposedMarket.slice(0, 200); }

  const marketId = `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newMarket = {
    id: marketId, created_at: new Date().toISOString(),
    ai_insight: { agent_id: winningProposal.agentName, confidence_score: Math.round((maxVotes / agents.length) * 100) },
    resolution: { question: marketQuestion, resolution_criteria: resolutionCriteria || "AI oracle swarm consensus", resolution_date: resolutionDate, oracle_type: "ai_swarm" },
    amm: { yes_token_balance: 1000, no_token_balance: 1000, current_odds_yes: 0.5, trading_fee: 0.02 },
    ux: { status: "PROPOSED", volume_24h: 0, total_volume: 0 },
    settlement: { winning_outcome: null, settlement_price: null },
  };
  let markets: unknown[] = [];
  try { markets = JSON.parse(readFileSync(MARKETS_FILE, "utf-8")); } catch { /* */ }
  markets.push(newMarket);
  writeFileSync(MARKETS_FILE, JSON.stringify(markets, null, 2));
  for (const t of transcripts) recordMarketCreation(t.agentName, marketId, marketQuestion, t.agentName === winningProposal.agentName ? "proposer" : "participant");

  session.marketId = marketId;
  session.marketQuestion = marketQuestion;
  save();

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: RESOLVE — SELF RESEARCH (Commit-Reveal)
  // ═══════════════════════════════════════════════════════════

  const committee = selectCommittee(agents, committeeSize);
  const commitEntries: { agent: string; vote: "YES" | "NO"; salt: string; hash: string; reasoning: string }[] = [];

  for (const agent of committee) {
    const result = await callAgent(baseUrl, agent.inftTokenId!,
      `You are an oracle agent resolving a prediction market. Today is ${today}.
MARKET: ${marketQuestion}
CRITERIA: ${resolutionCriteria}
Research independently. Cite sources with URLs.
Structure:
1. Evidence FOR (with URLs)
2. Evidence AGAINST (with URLs)
3. Strongest counterargument
4. Your vote: YES or NO
5. References: all URLs
End with "My vote: YES" or "My vote: NO".`, walletAddress);

    const vote = extractVote(result.response);
    const salt = generateSalt();
    const hash = computeCommitHash(vote, salt);
    const ti = transcripts.findIndex(t => t.agentName === agent.displayName);
    if (ti >= 0) {
      transcripts[ti].selfResearch = result.response;
      transcripts[ti].researchVote = vote;
      // Extract URLs
      const urls = result.response.match(/https?:\/\/[^\s\)\"]+/g) || [];
      transcripts[ti].researchReferences = urls;
    }
    recordDisputeVote(agent.displayName, marketId, marketQuestion, vote, "phase-1-reveal");
    commitEntries.push({ agent: agent.displayName, vote, salt, hash, reasoning: result.response });
  }

  // Tally phase 1
  const tally1 = { YES: 0, NO: 0 };
  for (const c of commitEntries) tally1[c.vote]++;
  const total1 = commitEntries.length;
  const yp1 = total1 > 0 ? tally1.YES / total1 : 0;
  const np1 = total1 > 0 ? tally1.NO / total1 : 0;
  let consensus1: "YES" | "NO" | null = null;
  if (yp1 >= 0.7) consensus1 = "YES"; else if (np1 >= 0.7) consensus1 = "NO";

  session.phase1Result = { tally: tally1, consensus: consensus1, resolved: consensus1 !== null };
  save();

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: RESOLVE — DISCUSSION (if no consensus)
  // ═══════════════════════════════════════════════════════════

  let consensus2: "YES" | "NO" | null = null;
  if (!consensus1) {
    // 3a. Each agent presents current view
    const researchSummary = commitEntries.map(c => `[${c.agent}]: ${c.reasoning.slice(0, 500)}`).join("\n\n---\n\n");
    for (const agent of committee) {
      const result = await callAgent(baseUrl, agent.inftTokenId!,
        `You are ${agent.displayName} in a dispute discussion. Today is ${today}.
MARKET: ${marketQuestion}
All agents' research:
${researchSummary}
Present: 1. Your current view with evidence 2. Key uncertainties
Cite references with URLs.`, walletAddress);
      const ti = transcripts.findIndex(t => t.agentName === agent.displayName);
      if (ti >= 0) transcripts[ti].currentView = result.response;
    }

    // 3b. Criticize others
    const viewsSummary = committee.map(a => {
      const t = transcripts.find(t2 => t2.agentName === a.displayName);
      return `[${a.displayName}]: ${t?.currentView || ""}`;
    }).join("\n\n---\n\n");

    for (const agent of committee) {
      const result = await callAgent(baseUrl, agent.inftTokenId!,
        `You are ${agent.displayName}. Respond to other agents' views:
${viewsSummary}
1. Which arguments are compelling? Verify their sources.
2. Which are flawed? Provide counter-evidence with URLs.
3. Has your position changed?
4. Additional references.
Reference agents by name. Every claim needs a source.`, walletAddress);
      const ti = transcripts.findIndex(t => t.agentName === agent.displayName);
      if (ti >= 0) transcripts[ti].criticismOfOthers = result.response;
    }

    // 3c. Show proof + final decision
    const criticismSummary = committee.map(a => {
      const t = transcripts.find(t2 => t2.agentName === a.displayName);
      return `[${a.displayName}]: ${t?.criticismOfOthers || ""}`;
    }).join("\n\n---\n\n");

    const commitEntries2: { agent: string; vote: "YES" | "NO"; salt: string; hash: string }[] = [];
    for (const agent of committee) {
      const result = await callAgent(baseUrl, agent.inftTokenId!,
        `Final vote. You've heard all arguments. Today is ${today}.
MARKET: ${marketQuestion}
Discussion: ${criticismSummary}
You MUST choose YES or NO based on weight of evidence.
Cite the most decisive references. End with "FINAL VOTE: YES" or "FINAL VOTE: NO".`, walletAddress);

      const vote = extractVote(result.response);
      const salt = generateSalt();
      const hash = computeCommitHash(vote, salt);
      const ti = transcripts.findIndex(t => t.agentName === agent.displayName);
      if (ti >= 0) {
        transcripts[ti].proofAndReferences = result.response;
        transcripts[ti].discussionFinalVote = vote;
      }
      recordDisputeVote(agent.displayName, marketId, marketQuestion, vote, "phase-2-reveal");
      commitEntries2.push({ agent: agent.displayName, vote, salt, hash });
    }

    const tally2 = { YES: 0, NO: 0 };
    for (const c of commitEntries2) tally2[c.vote]++;
    const total2 = commitEntries2.length;
    const yp2 = total2 > 0 ? tally2.YES / total2 : 0;
    const np2 = total2 > 0 ? tally2.NO / total2 : 0;
    if (yp2 >= 0.7) consensus2 = "YES"; else if (np2 >= 0.7) consensus2 = "NO";

    session.phase2Result = { tally: tally2, consensus: consensus2, resolved: consensus2 !== null };
  }

  // Update market + reputation
  const finalOutcome = consensus1 || consensus2;
  let repUpdates: { agent: string; change: number; newRep: number }[] = [];
  if (finalOutcome) {
    try {
      const mkts = JSON.parse(readFileSync(MARKETS_FILE, "utf-8"));
      const idx = mkts.findIndex((m: { id: string }) => m.id === marketId);
      if (idx >= 0) {
        mkts[idx].ux.status = "RESOLVED";
        mkts[idx].settlement.winning_outcome = finalOutcome;
        mkts[idx].settlement.settlement_price = finalOutcome === "YES" ? 0.95 : 0.05;
        writeFileSync(MARKETS_FILE, JSON.stringify(mkts, null, 2));
      }
    } catch { /* */ }

    const allVotes = (consensus1 ? commitEntries : commitEntries.concat([])).map(c => ({ agent: c.agent, vote: c.vote }));
    repUpdates = updateReputation(marketId, marketQuestion, finalOutcome, allVotes);
  }
  session.finalOutcome = finalOutcome || undefined;
  session.reputationUpdates = repUpdates;

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: PEER VOTE — agents rate each other 0-10
  // ═══════════════════════════════════════════════════════════

  const agentNames = agents.map(a => a.displayName);
  for (let i = 0; i < agents.length; i++) {
    const others = agentNames.filter(n => n !== agents[i].displayName);
    const result = await callAgent(baseUrl, agents[i].inftTokenId!,
      `You are ${agents[i].displayName}. Rate each agent's reliability from 0-10 based on the session.
Agents: ${others.join(", ")}
Consider: quality of evidence, accuracy of references, consistency, contribution to consensus.
Reply as JSON: {"AgentName": score, ...} — one entry per agent, scores 0-10.`, walletAddress);

    try {
      const m = result.response.match(/\{[\s\S]*\}/);
      if (m) {
        const ratings = JSON.parse(m[0]);
        transcripts[i].peerRatings = ratings;
      }
    } catch {
      transcripts[i].peerRatings = {};
    }
  }

  session.completedAt = new Date().toISOString();
  save();

  return res.json({
    success: true,
    sessionId,
    marketId,
    marketQuestion,
    phase1: session.phase1Result,
    phase2: session.phase2Result,
    finalOutcome,
    reputationUpdates: repUpdates,
    transcripts: transcripts.map(t => ({
      agent: t.agentName, tokenId: t.tokenId, reputation: t.reputation,
      researchVote: t.researchVote, discussionFinalVote: t.discussionFinalVote,
      peerRatings: t.peerRatings,
      referencesCount: t.researchReferences.length,
    })),
    fullTranscriptPath: `/api/commands/session/${sessionId}`,
  });
}
