import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PrivateKey,
} from "@hashgraph/sdk";
import type { Client, Key } from "@hashgraph/sdk";
import { createHash, randomBytes } from "crypto";

// ── Vote Types ──────────────────────────────────
// YES | NO | UNSURE | NOT_ENOUGH_DATA
// DIDNT_VOTE = agent never submitted (computed during tally, penalized)
export const VOTE_OPTIONS = ["YES", "NO", "UNSURE", "NOT_ENOUGH_DATA"] as const;
export type VoteOption = (typeof VOTE_OPTIONS)[number];

const MIRROR_URL = "https://testnet.mirrornode.hedera.com";

// ── Mirror Node Reader ──────────────────────────────────

interface RawTopicMessage {
  sequence_number: number;
  consensus_timestamp: string;
  message: string;
  payer_account_id: string;
}

export async function readTopicMessages(
  topicId: string,
  limit = 100
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${MIRROR_URL}/api/v1/topics/${topicId}/messages?limit=${limit}&order=asc`
  );
  const data = await res.json();
  return (data.messages || []).map((msg: RawTopicMessage) => {
    try {
      const decoded = JSON.parse(
        Buffer.from(msg.message, "base64").toString("utf-8")
      );
      return {
        ...decoded,
        _seq: msg.sequence_number,
        _timestamp: msg.consensus_timestamp,
        _payer: msg.payer_account_id,
      };
    } catch {
      return {
        _raw: Buffer.from(msg.message, "base64").toString("utf-8"),
        _seq: msg.sequence_number,
        _timestamp: msg.consensus_timestamp,
        _payer: msg.payer_account_id,
      };
    }
  });
}

// ── Topic Helpers ──────────────────────────────────

export async function createTopic(
  client: Client,
  memo: string,
  submitKey?: Key
) {
  const tx = new TopicCreateTransaction().setTopicMemo(memo);
  if (submitKey) tx.setSubmitKey(submitKey);
  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  return receipt.topicId!.toString();
}

export async function submitMessage(
  client: Client,
  topicId: string,
  message: string
) {
  const tx = new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message);
  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  return {
    status: receipt.status.toString(),
    sequenceNumber: receipt.topicSequenceNumber?.toString(),
  };
}

export function getOperatorKey(): PrivateKey {
  return PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY!);
}

// ── HCS-20: Auditable Points ──────────────────────────────────
// Spec: https://hol.org/docs/standards/hcs-20/
// All numeric values are STRINGS per spec (max 18 chars)

export function buildHCS20Deploy(
  name: string,
  tick: string,
  max: string,
  lim: string,
  memo?: string
) {
  return JSON.stringify({
    p: "hcs-20",
    op: "deploy",
    name,
    tick: tick.toLowerCase().trim(),
    max,
    lim,
    ...(memo && { m: memo }),
  });
}

export function buildHCS20Mint(
  tick: string,
  amt: string,
  to: string,
  memo?: string
) {
  return JSON.stringify({
    p: "hcs-20",
    op: "mint",
    tick: tick.toLowerCase().trim(),
    amt,
    to,
    ...(memo && { m: memo }),
  });
}

export function buildHCS20Burn(
  tick: string,
  amt: string,
  from: string,
  memo?: string
) {
  return JSON.stringify({
    p: "hcs-20",
    op: "burn",
    tick: tick.toLowerCase().trim(),
    amt,
    from,
    ...(memo && { m: memo }),
  });
}

export function buildHCS20Transfer(
  tick: string,
  amt: string,
  from: string,
  to: string,
  memo?: string
) {
  return JSON.stringify({
    p: "hcs-20",
    op: "transfer",
    tick: tick.toLowerCase().trim(),
    amt,
    from,
    to,
    ...(memo && { m: memo }),
  });
}

export function computeHCS20Balances(messages: Record<string, unknown>[]) {
  const tickers: Record<
    string,
    { name: string; max: number; lim: number; totalMinted: number }
  > = {};
  const balances: Record<string, Record<string, number>> = {};

  for (const msg of messages) {
    if (msg.p !== "hcs-20") continue;
    const tick = msg.tick as string;

    switch (msg.op) {
      case "deploy":
        tickers[tick] = {
          name: msg.name as string,
          max: parseInt(msg.max as string) || Infinity,
          lim: parseInt(msg.lim as string) || Infinity,
          totalMinted: 0,
        };
        if (!balances[tick]) balances[tick] = {};
        break;
      case "mint": {
        const ticker = tickers[tick];
        if (!ticker) break;
        const amt = parseInt(msg.amt as string);
        if (amt > ticker.lim || ticker.totalMinted + amt > ticker.max) break;
        ticker.totalMinted += amt;
        if (!balances[tick]) balances[tick] = {};
        const to = msg.to as string;
        balances[tick][to] = (balances[tick][to] || 0) + amt;
        break;
      }
      case "burn": {
        const amt = parseInt(msg.amt as string);
        const from = msg.from as string;
        if (!balances[tick]?.[from] || balances[tick][from] < amt) break;
        balances[tick][from] -= amt;
        break;
      }
      case "transfer": {
        const amt = parseInt(msg.amt as string);
        const from = msg.from as string;
        const to = msg.to as string;
        if (!balances[tick]?.[from] || balances[tick][from] < amt) break;
        balances[tick][from] -= amt;
        balances[tick][to] = (balances[tick][to] || 0) + amt;
        break;
      }
    }
  }

  return { tickers, balances };
}

// ── HCS-2: Topic Registries ──────────────────────────────────
// Spec: https://hol.org/docs/standards/hcs-2/
// Topic memo: hcs-2:<indexed>:<ttl>  (0=indexed, 1=non-indexed)

export function buildHCS2Register(topicId: string, memo?: string) {
  return JSON.stringify({
    p: "hcs-2",
    op: "register",
    t_id: topicId,
    ...(memo && { m: memo }),
  });
}

export function buildHCS2Update(
  uid: string,
  topicId: string,
  memo?: string
) {
  return JSON.stringify({
    p: "hcs-2",
    op: "update",
    uid,
    t_id: topicId,
    ...(memo && { m: memo }),
  });
}

export function buildHCS2Delete(uid: string, memo?: string) {
  return JSON.stringify({
    p: "hcs-2",
    op: "delete",
    uid,
    ...(memo && { m: memo }),
  });
}

export function computeHCS2State(messages: Record<string, unknown>[]) {
  const entries: Record<
    string,
    { t_id: string; m?: string; deleted: boolean }
  > = {};

  for (const msg of messages) {
    if (msg.p !== "hcs-2") continue;
    const seq = String(msg._seq);

    switch (msg.op) {
      case "register":
        entries[seq] = {
          t_id: msg.t_id as string,
          m: msg.m as string | undefined,
          deleted: false,
        };
        break;
      case "update": {
        const uid = msg.uid as string;
        if (entries[uid] && !entries[uid].deleted) {
          entries[uid] = {
            t_id: msg.t_id as string,
            m: msg.m as string | undefined,
            deleted: false,
          };
        }
        break;
      }
      case "delete": {
        const uid = msg.uid as string;
        if (entries[uid]) entries[uid].deleted = true;
        break;
      }
    }
  }

  return Object.entries(entries)
    .filter(([, v]) => !v.deleted)
    .map(([uid, v]) => ({ uid, t_id: v.t_id, m: v.m }));
}

// ── HCS-11: Profile Metadata ──────────────────────────────────
// Spec: https://hol.org/docs/standards/hcs-11/
// Profile JSON submitted to a topic. Account memo: hcs-11:hcs://1/<topicId>

export interface AgentProfileLinks {
  reputationTopicId?: string;   // HCS-20 points topic
  registryTopicId?: string;     // HCS-2 registry this agent is listed in
  floraTopicIds?: {              // HCS-16 Flora participation
    communication?: string;
    transaction?: string;
    state?: string;
  };
}

export function buildHCS11Profile(
  displayName: string,
  hederaAccountId: string,
  capabilities: number[],
  model: string,
  bio?: string,
  links?: AgentProfileLinks
) {
  return JSON.stringify({
    version: "1.0",
    type: 1,
    display_name: displayName,
    uaid: `uaid:did:hedera:testnet:${hederaAccountId}`,
    bio: bio || "",
    aiAgent: {
      type: 1,
      capabilities,
      model,
      creator: "Cannes2026",
    },
    properties: {
      hederaAccountId,
      ...(links?.reputationTopicId && { reputationTopicId: links.reputationTopicId }),
      ...(links?.registryTopicId && { registryTopicId: links.registryTopicId }),
      ...(links?.floraTopicIds && { floraTopics: links.floraTopicIds }),
    },
  });
}

// ── HCS-16: Flora Coordination ──────────────────────────────────
// Spec: https://hol.org/docs/standards/hcs-16/
// 3 topics: communication (0), transaction (1), state (2)
// Memo: hcs-16:<floraId>:<topicType>

export function buildHCS16FloraCreated(
  floraAccountId: string,
  cTopicId: string,
  tTopicId: string,
  sTopicId: string,
  memo?: string
) {
  return JSON.stringify({
    p: "hcs-16",
    op: "flora_created",
    flora_account_id: floraAccountId,
    topics: {
      communication: cTopicId,
      transaction: tTopicId,
      state: sTopicId,
    },
    ...(memo && { m: memo }),
  });
}

export function buildHCS16Message(
  senderId: string,
  floraAccountId: string,
  content: string
) {
  return JSON.stringify({
    p: "hcs-16",
    op: "message",
    operator_id: `${senderId}@${floraAccountId}`,
    data: content,
    timestamp: new Date().toISOString(),
  });
}

export function buildHCS16Vote(
  voterId: string,
  floraAccountId: string,
  candidateAccountId: string,
  approve: boolean,
  memo?: string
) {
  return JSON.stringify({
    p: "hcs-16",
    op: "flora_join_vote",
    account_id: candidateAccountId,
    approve,
    operator_id: `${voterId}@${floraAccountId}`,
    ...(memo && { m: memo }),
  });
}

export function buildHCS16StateUpdate(
  operatorId: string,
  floraAccountId: string,
  hash: string,
  epoch: number
) {
  return JSON.stringify({
    p: "hcs-16",
    op: "state_update",
    operator_id: `${operatorId}@${floraAccountId}`,
    hash,
    epoch,
    timestamp: new Date().toISOString(),
  });
}

// ── HCS-16: Commit-Reveal Voting ──────────────────────────────────
// Phase 1: blind vote (commit hash, then reveal after deadline)
// Phase 2: evidence & discussion
// Phase 3: final vote (commit hash, then reveal after deadline)

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashVote(vote: VoteOption, salt: string): string {
  return createHash("sha256").update(`${vote}|${salt}`).digest("hex");
}

export function verifyVote(
  vote: string,
  salt: string,
  commitHash: string
): boolean {
  const computed = createHash("sha256").update(`${vote}|${salt}`).digest("hex");
  return computed === commitHash;
}

export function buildHCS16Commit(
  operatorId: string,
  floraAccountId: string,
  phase: number,
  commitHash: string,
  marketId: string
) {
  return JSON.stringify({
    p: "hcs-16",
    op: "commit",
    operator_id: `${operatorId}@${floraAccountId}`,
    phase,
    hash: commitHash,
    market_id: marketId,
    timestamp: new Date().toISOString(),
  });
}

export function buildHCS16Reveal(
  operatorId: string,
  floraAccountId: string,
  phase: number,
  vote: VoteOption,
  salt: string,
  marketId: string
) {
  return JSON.stringify({
    p: "hcs-16",
    op: "reveal",
    operator_id: `${operatorId}@${floraAccountId}`,
    phase,
    vote,
    salt,
    market_id: marketId,
    timestamp: new Date().toISOString(),
  });
}

export function buildHCS16Discussion(
  operatorId: string,
  floraAccountId: string,
  marketId: string,
  content: string,
  evidenceUrl?: string
) {
  return JSON.stringify({
    p: "hcs-16",
    op: "discussion",
    operator_id: `${operatorId}@${floraAccountId}`,
    market_id: marketId,
    data: content,
    ...(evidenceUrl && { evidence_url: evidenceUrl }),
    timestamp: new Date().toISOString(),
  });
}

// ── Tally: replay messages, verify reveals, compute result ──────

// ── Tally: replay messages, verify reveals, enforce time windows ──────
//
// Time windows (enforced via Hedera consensus_timestamp):
//   COMMIT WINDOW:  start → commitDeadline
//   REVEAL WINDOW:  commitDeadline → revealDeadline
//
//   commit before commitDeadline    → valid
//   reveal before commitDeadline    → INVALID (early reveal, ignored)
//   reveal between deadlines        → valid
//   reveal after revealDeadline     → INVALID (too late = DIDNT_VOTE)
//   never committed                 → DIDNT_VOTE (penalized)

interface CommitRecord {
  operator_id: string;
  hash: string;
  timestamp: string; // Hedera consensus_timestamp
}

interface TallyResult {
  phase: number;
  commits: Record<string, string>;
  reveals: Record<string, { vote: string; verified: boolean; rejected?: string }>;
  tally: Record<string, number>;
  didntVote: string[];
  didntReveal: string[]; // committed but never revealed (penalize)
  consensus: string | null;
}

export interface TallyDeadlines {
  phase1CommitDeadline: string; // Hedera timestamp format "seconds.nanoseconds"
  phase1RevealDeadline: string;
  phase3CommitDeadline: string;
  phase3RevealDeadline: string;
}

export function computeVoteTally(
  messages: Record<string, unknown>[],
  marketId: string,
  committeeMembers: string[],
  deadlines?: TallyDeadlines
): { phase1: TallyResult; phase3: TallyResult; discussion: Record<string, unknown>[] } {
  const commits: Record<number, Record<string, CommitRecord>> = { 1: {}, 3: {} };
  const reveals: Record<number, Record<string, { vote: string; salt: string; timestamp: string }>> = { 1: {}, 3: {} };
  const discussion: Record<string, unknown>[] = [];

  for (const msg of messages) {
    if (msg.p !== "hcs-16") continue;
    if (msg.market_id !== marketId) continue;
    const opId = msg.operator_id as string;
    const ts = msg._timestamp as string; // Hedera consensus_timestamp

    switch (msg.op) {
      case "commit": {
        const phase = msg.phase as number;
        if (phase === 1 || phase === 3) {
          commits[phase][opId] = {
            operator_id: opId,
            hash: msg.hash as string,
            timestamp: ts,
          };
        }
        break;
      }
      case "reveal": {
        const phase = msg.phase as number;
        if (phase === 1 || phase === 3) {
          reveals[phase][opId] = {
            vote: msg.vote as string,
            salt: msg.salt as string,
            timestamp: ts,
          };
        }
        break;
      }
      case "discussion":
        discussion.push(msg);
        break;
    }
  }

  function tallyPhase(
    phase: number,
    commitDeadline?: string,
    revealDeadline?: string
  ): TallyResult {
    const phaseCommits = commits[phase];
    const phaseReveals = reveals[phase];
    const verifiedReveals: Record<string, { vote: string; verified: boolean; rejected?: string }> = {};
    const tally: Record<string, number> = { YES: 0, NO: 0, UNSURE: 0, NOT_ENOUGH_DATA: 0 };
    const didntVote: string[] = [];
    const didntReveal: string[] = [];

    for (const [opId, reveal] of Object.entries(phaseReveals)) {
      const commit = phaseCommits[opId];
      if (!commit) {
        // Reveal without commit — ignore
        verifiedReveals[opId] = { vote: reveal.vote, verified: false, rejected: "no_commit" };
        continue;
      }

      // Time window enforcement (if deadlines provided)
      if (commitDeadline && reveal.timestamp < commitDeadline) {
        // Revealed BEFORE commit deadline — early reveal, rejected
        verifiedReveals[opId] = { vote: reveal.vote, verified: false, rejected: "early_reveal" };
        continue;
      }
      if (revealDeadline && reveal.timestamp > revealDeadline) {
        // Revealed AFTER reveal deadline — too late
        verifiedReveals[opId] = { vote: reveal.vote, verified: false, rejected: "late_reveal" };
        continue;
      }

      // Hash verification
      const verified = verifyVote(reveal.vote, reveal.salt, commit.hash);
      verifiedReveals[opId] = { vote: reveal.vote, verified };
      if (verified && reveal.vote in tally) {
        tally[reveal.vote]++;
      }
    }

    // Who didn't commit at all
    for (const member of committeeMembers) {
      if (!phaseCommits[member]) {
        didntVote.push(member);
      }
    }

    // Who committed but didn't reveal (or reveal was rejected)
    for (const opId of Object.keys(phaseCommits)) {
      if (!phaseReveals[opId] || verifiedReveals[opId]?.rejected) {
        didntReveal.push(opId);
      }
    }

    // Consensus: ≥70% of verified votes agree
    const totalVerified = Object.values(verifiedReveals).filter((r) => r.verified).length;
    let consensus: string | null = null;
    if (totalVerified > 0) {
      for (const [vote, count] of Object.entries(tally)) {
        if (count / totalVerified >= 0.7) {
          consensus = vote;
          break;
        }
      }
    }

    return {
      phase,
      commits: Object.fromEntries(
        Object.entries(phaseCommits).map(([k, v]) => [k, v.hash])
      ),
      reveals: verifiedReveals,
      tally,
      didntVote,
      didntReveal,
      consensus,
    };
  }

  return {
    phase1: tallyPhase(
      1,
      deadlines?.phase1CommitDeadline,
      deadlines?.phase1RevealDeadline
    ),
    phase3: tallyPhase(
      3,
      deadlines?.phase3CommitDeadline,
      deadlines?.phase3RevealDeadline
    ),
    discussion,
  };
}
