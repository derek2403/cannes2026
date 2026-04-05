import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  TransferTransaction,
  TokenAssociateTransaction,
  Hbar,
  PrivateKey,
} from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";

const STATE_PATH = join(process.cwd(), "hedera-state.json");
const HISTORY_PATH = join(process.cwd(), "data", "agent-history.json");

function getState() {
  return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
}
function saveState(state: Record<string, unknown>) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

interface AgentVoteResult {
  agent: string;
  vote: string;
  correct: boolean;
}

/**
 * POST /api/market/payout
 *
 * After oracle resolution completes, pays USDC to participating agents.
 * - Correct voters get 10 USDC each
 * - Wrong voters get nothing (already penalized via reputation)
 *
 * Body: { marketId, consensus, agentVotes: [{ agent, vote, correct }] }
 *
 * Returns earnings summary per agent.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { marketId, consensus, agentVotes } = req.body as {
    marketId: string;
    consensus: string;
    agentVotes: AgentVoteResult[];
  };

  if (!marketId || !consensus || !agentVotes?.length) {
    return res.status(400).json({ error: "marketId, consensus, and agentVotes required" });
  }

  const state = getState();
  const usdcTokenId = state.usdc_token_id;

  if (!usdcTokenId) {
    return res.status(400).json({
      error: "USDC token not created yet. Call POST /api/market/create-usdc first.",
    });
  }

  const operatorId = state.operatorId || process.env.HEDERA_OPERATOR_ID!;
  const operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY!);
  const client = getClient();

  const REWARD_AMOUNT = 10_00; // 10 USDC (2 decimals)
  const agents: { displayName: string; accountId: string }[] = state.agents || [];

  const earnings: {
    agent: string;
    accountId: string;
    vote: string;
    correct: boolean;
    earned: string;
    tx: string | null;
  }[] = [];

  try {
    for (const av of agentVotes) {
      const agentEntry = agents.find((a) => a.displayName === av.agent);
      if (!agentEntry) {
        earnings.push({
          agent: av.agent,
          accountId: "unknown",
          vote: av.vote,
          correct: av.correct,
          earned: "0.00",
          tx: null,
        });
        continue;
      }

      if (!av.correct) {
        earnings.push({
          agent: av.agent,
          accountId: agentEntry.accountId,
          vote: av.vote,
          correct: false,
          earned: "0.00",
          tx: null,
        });
        continue;
      }

      // Ensure agent is associated with USDC
      try {
        const assocTx = await new TokenAssociateTransaction()
          .setAccountId(agentEntry.accountId)
          .setTokenIds([usdcTokenId])
          .setMaxTransactionFee(new Hbar(5))
          .freezeWith(client);
        const assocSigned = await assocTx.sign(operatorKey);
        const assocResp = await assocSigned.execute(client);
        await assocResp.getReceipt(client);
      } catch {
        // already associated
      }

      // Transfer 10 USDC reward
      const transferTx = await new TransferTransaction()
        .addTokenTransfer(usdcTokenId, operatorId, -REWARD_AMOUNT)
        .addTokenTransfer(usdcTokenId, agentEntry.accountId, REWARD_AMOUNT)
        .setMaxTransactionFee(new Hbar(5))
        .freezeWith(client);

      const transferSigned = await transferTx.sign(operatorKey);
      const transferResp = await transferSigned.execute(client);
      await transferResp.getReceipt(client);

      earnings.push({
        agent: av.agent,
        accountId: agentEntry.accountId,
        vote: av.vote,
        correct: true,
        earned: "10.00",
        tx: transferResp.transactionId.toString(),
      });
    }

    client.close();

    // ── Record payout in agent-history ──────────────────────────
    const history = JSON.parse(readFileSync(HISTORY_PATH, "utf-8"));
    for (const e of earnings) {
      history.events.push({
        type: "usdc_payout",
        timestamp: new Date().toISOString(),
        agentName: e.agent,
        marketId,
        consensus,
        vote: e.vote,
        correct: e.correct,
        earned: e.earned,
        tx: e.tx,
      });
    }
    writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));

    // ── Save cumulative earnings to state ───────────────────────
    if (!state.usdc_earnings) state.usdc_earnings = {};
    for (const e of earnings) {
      const prev = parseFloat(state.usdc_earnings[e.agent] || "0");
      state.usdc_earnings[e.agent] = (prev + parseFloat(e.earned)).toFixed(2);
    }
    saveState(state);

    const totalPaid = earnings
      .reduce((sum, e) => sum + parseFloat(e.earned), 0)
      .toFixed(2);

    return res.json({
      success: true,
      marketId,
      consensus,
      usdc_token_id: usdcTokenId,
      reward_per_correct: "10.00",
      total_paid: totalPaid,
      earnings,
      cumulative: state.usdc_earnings,
    });
  } catch (err: unknown) {
    client.close();
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
