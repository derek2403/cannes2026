import type { NextApiRequest } from "next";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STATE_FILE = join(process.cwd(), "hedera-state.json");
const HISTORY_FILE = join(process.cwd(), "data", "agent-history.json");

export interface AgentEntry {
  displayName: string;
  accountId?: string;
  profileTopicId?: string;
  reputationTopicId?: string;
  registryTopicId?: string;
  inftTokenId?: number;
  modelProvider?: string;
  reputation?: number;
  capabilities?: number[];
  model?: string;
}

export interface HederaState {
  network: string;
  operatorId: string;
  registryTopicId: string;
  reputationTopicId: string;
  agents: AgentEntry[];
  [key: string]: unknown;
}

/** Read hedera-state.json */
export function readHederaState(): HederaState {
  return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
}

/** Get all agents that have an inftTokenId (minted on-chain) */
export function getMintedAgents(): AgentEntry[] {
  const state = readHederaState();
  return state.agents.filter((a) => a.inftTokenId != null);
}

/** Build base URL from request headers for internal API calls */
export function getBaseUrl(req: NextApiRequest): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

/** Call an agent's iNFT inference and return the text response */
export async function callAgent(
  baseUrl: string,
  tokenId: number,
  message: string,
  walletAddress: string
): Promise<{ agentName?: string; response: string; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/inft/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenId,
        message,
        userAddress: walletAddress,
        maxTokens: 800,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { response: "", error: data.error || "Inference failed" };
    }
    return { response: data.response || "" };
  } catch (err: unknown) {
    return {
      response: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Get the wallet address from the server's private key */
export async function getWalletAddress(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/inft/wallet-address`, {
    method: "POST",
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to get wallet");
  return data.address;
}

/** Extract YES/NO/UNSURE from an agent's text response */
export function extractVote(
  text: string
): "YES" | "NO" | "UNSURE" {
  const upper = text.toUpperCase();
  // Look for explicit vote patterns first
  const voteMatch = upper.match(
    /\b(?:MY\s+(?:VOTE|ANSWER|DECISION)\s+(?:IS\s+)?|I\s+VOTE\s+|FINAL\s+(?:ANSWER|VOTE)[:\s]+)(YES|NO|UNSURE)\b/
  );
  if (voteMatch) return voteMatch[1] as "YES" | "NO" | "UNSURE";

  // Count occurrences
  const yesCount = (upper.match(/\bYES\b/g) || []).length;
  const noCount = (upper.match(/\bNO\b/g) || []).length;
  const unsureCount = (upper.match(/\bUNSURE\b/g) || []).length;

  if (unsureCount > yesCount && unsureCount > noCount) return "UNSURE";
  if (yesCount > noCount) return "YES";
  if (noCount > yesCount) return "NO";
  return "UNSURE";
}

// ═════════════════════════════════════════════════════════════════
//  COMMIT-REVEAL HELPERS (HCS-16 Flora pattern)
//  Reuses canonical functions from hcs-standards.ts:
//    generateSalt()  — randomBytes(16) per spec
//    hashVote()      — sha256(vote|salt) with pipe separator per spec
//    verifyVote()    — verify reveal against commit hash
// ═════════════════════════════════════════════════════════════════

export {
  generateSalt,
} from "@/lib/hcs-standards";

import {
  hashVote,
  verifyVote,
} from "@/lib/hcs-standards";

/** Compute SHA-256 commit hash from vote + salt (delegates to HCS-16 spec) */
export function computeCommitHash(vote: string, salt: string): string {
  return hashVote(vote as "YES" | "NO" | "UNSURE" | "NOT_ENOUGH_DATA", salt);
}

/** Verify a revealed vote against its commit hash (delegates to HCS-16 spec) */
export function verifyCommit(
  vote: string,
  salt: string,
  commitHash: string
): boolean {
  return verifyVote(vote, salt, commitHash);
}

export interface CommitEntry {
  agent: string;
  tokenId: number;
  commitHash: string;
  salt: string; // stored server-side, not exposed until reveal
  vote: "YES" | "NO" | "UNSURE";
  reasoning: string;
}

export interface RevealEntry {
  agent: string;
  tokenId: number;
  vote: "YES" | "NO" | "UNSURE";
  salt: string;
  commitHash: string;
  verified: boolean;
  reasoning: string;
}

// ═════════════════════════════════════════════════════════════════
//  HISTORY TRACKING
// ═════════════════════════════════════════════════════════════════

export interface HistoryEvent {
  type: "market_created" | "dispute_vote" | "reputation_change";
  timestamp: string;
  agentName: string;
  marketId: string;
  marketQuestion?: string;
  vote?: string;
  outcome?: string;
  correct?: boolean;
  repChange?: number;
  phase?: string;
  role?: string; // "proposer" | "voter"
}

export interface AgentHistory {
  events: HistoryEvent[];
}

export function readHistory(): AgentHistory {
  if (!existsSync(HISTORY_FILE)) return { events: [] };
  try {
    return JSON.parse(readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return { events: [] };
  }
}

export function writeHistory(history: AgentHistory): void {
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function appendHistory(event: HistoryEvent): void {
  const history = readHistory();
  history.events.push(event);
  writeHistory(history);
}

/** Get history for a specific agent */
export function getAgentEvents(agentName: string): HistoryEvent[] {
  return readHistory().events.filter((e) => e.agentName === agentName);
}

// ═════════════════════════════════════════════════════════════════
//  REPUTATION-WEIGHTED AGENT SELECTION
// ═════════════════════════════════════════════════════════════════

/**
 * Select N agents from the pool, weighted by reputation.
 * Higher reputation = higher probability of selection.
 * If committeeSize >= pool size, returns all agents.
 */
export function selectCommittee(
  agents: AgentEntry[],
  committeeSize: number
): AgentEntry[] {
  if (agents.length <= committeeSize) return [...agents];

  // Build weighted pool: rep acts as weight
  const pool = agents.map((a) => ({
    agent: a,
    weight: Math.max(1, a.reputation ?? 10), // min weight 1
  }));

  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  const selected: AgentEntry[] = [];
  const usedIndices = new Set<number>();

  while (selected.length < committeeSize) {
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      if (usedIndices.has(i)) continue;
      rand -= pool[i].weight;
      if (rand <= 0) {
        selected.push(pool[i].agent);
        usedIndices.add(i);
        break;
      }
    }
    // Safety: if rounding issues, just pick first unused
    if (selected.length < usedIndices.size) {
      for (let i = 0; i < pool.length; i++) {
        if (!usedIndices.has(i)) {
          selected.push(pool[i].agent);
          usedIndices.add(i);
          break;
        }
      }
    }
  }

  return selected;
}

// ═════════════════════════════════════════════════════════════════
//  REPUTATION UPDATE
// ═════════════════════════════════════════════════════════════════

const REP_CORRECT = 10;
const REP_WRONG = -5;

/**
 * After a market resolves, update reputation for all participating agents.
 * +10 for voting with the consensus, -5 for voting against.
 * Writes to both hedera-state.json and agent-history.json.
 */
export function updateReputation(
  marketId: string,
  marketQuestion: string,
  outcome: "YES" | "NO",
  agentVotes: { agent: string; vote: "YES" | "NO" | "UNSURE" }[]
): { agent: string; vote: string; correct: boolean; change: number; newRep: number }[] {
  const state = readHederaState();
  const results: { agent: string; vote: string; correct: boolean; change: number; newRep: number }[] = [];

  for (const av of agentVotes) {
    const stateAgent = state.agents.find((a) => a.displayName === av.agent);
    if (!stateAgent) continue;

    const correct = av.vote === outcome;
    const change = av.vote === "UNSURE" ? 0 : correct ? REP_CORRECT : REP_WRONG;
    const oldRep = stateAgent.reputation ?? 10;
    const newRep = Math.max(0, oldRep + change);

    stateAgent.reputation = newRep;

    results.push({
      agent: av.agent,
      vote: av.vote,
      correct,
      change,
      newRep,
    });

    // Record history
    appendHistory({
      type: "reputation_change",
      timestamp: new Date().toISOString(),
      agentName: av.agent,
      marketId,
      marketQuestion,
      vote: av.vote,
      outcome,
      correct,
      repChange: change,
    });
  }

  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  return results;
}

/** Record that an agent participated in market creation */
export function recordMarketCreation(
  agentName: string,
  marketId: string,
  marketQuestion: string,
  role: string
): void {
  appendHistory({
    type: "market_created",
    timestamp: new Date().toISOString(),
    agentName,
    marketId,
    marketQuestion,
    role,
  });
}

/** Record a dispute vote (before resolution is known) */
export function recordDisputeVote(
  agentName: string,
  marketId: string,
  marketQuestion: string,
  vote: string,
  phase: string
): void {
  appendHistory({
    type: "dispute_vote",
    timestamp: new Date().toISOString(),
    agentName,
    marketId,
    marketQuestion,
    vote,
    phase,
  });
}
