import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  TokenCreateTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  Hbar,
  PrivateKey,
  TokenType,
  TokenSupplyType,
} from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";

const STATE_PATH = join(process.cwd(), "hedera-state.json");

function getState() {
  return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
}
function saveState(state: Record<string, unknown>) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

/**
 * POST /api/market/create-usdc
 *
 * Creates a mock USDC token on Hedera testnet via HTS.
 * 100M supply, 2 decimals, operator = treasury.
 * Then associates + airdrops 100 USDC to every registered agent.
 *
 * Idempotent — if usdc_token_id already exists in state, skips creation
 * and only airdrops to agents that haven't received yet.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const state = getState();
  const operatorId = state.operatorId || process.env.HEDERA_OPERATOR_ID!;
  const operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY!);
  const client = getClient();

  const AIRDROP_AMOUNT = 100_00; // 100 USDC with 2 decimals

  try {
    let usdcTokenId = state.usdc_token_id;

    // ── Create USDC token if not yet created ───────────────────
    if (!usdcTokenId) {
      const createTx = await new TokenCreateTransaction()
        .setTokenName("USDC")
        .setTokenSymbol("USDC")
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(100_000_000_00) // 100M with 2 decimals
        .setInitialSupply(100_000_000_00)
        .setDecimals(2)
        .setTreasuryAccountId(operatorId)
        .setAdminKey(operatorKey.publicKey)
        .setSupplyKey(operatorKey.publicKey)
        .setFreezeKey(operatorKey.publicKey)
        .setWipeKey(operatorKey.publicKey)
        .setPauseKey(operatorKey.publicKey)
        .setMaxTransactionFee(new Hbar(30))
        .freezeWith(client);

      const signed = await createTx.sign(operatorKey);
      const response = await signed.execute(client);
      const receipt = await response.getReceipt(client);
      usdcTokenId = receipt.tokenId!.toString();

      state.usdc_token_id = usdcTokenId;
      saveState(state);
    }

    // ── Airdrop 100 USDC to every agent ────────────────────────
    const agents: { displayName: string; accountId: string }[] = state.agents || [];
    if (!state.usdc_airdrops) state.usdc_airdrops = {};

    const airdropped: { agent: string; accountId: string; amount: string }[] = [];

    for (const agent of agents) {
      if (state.usdc_airdrops[agent.accountId]) continue; // already airdropped

      // Associate token with agent account
      try {
        const assocTx = await new TokenAssociateTransaction()
          .setAccountId(agent.accountId)
          .setTokenIds([usdcTokenId])
          .setMaxTransactionFee(new Hbar(5))
          .freezeWith(client);

        // Agent accounts were created with operator key, so operator can sign
        const assocSigned = await assocTx.sign(operatorKey);
        const assocResp = await assocSigned.execute(client);
        await assocResp.getReceipt(client);
      } catch {
        // TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT — safe to ignore
      }

      // Transfer 100 USDC from treasury to agent
      const transferTx = await new TransferTransaction()
        .addTokenTransfer(usdcTokenId, operatorId, -AIRDROP_AMOUNT)
        .addTokenTransfer(usdcTokenId, agent.accountId, AIRDROP_AMOUNT)
        .setMaxTransactionFee(new Hbar(5))
        .freezeWith(client);

      const transferSigned = await transferTx.sign(operatorKey);
      const transferResp = await transferSigned.execute(client);
      await transferResp.getReceipt(client);

      state.usdc_airdrops[agent.accountId] = {
        amount: "100.00",
        timestamp: new Date().toISOString(),
      };

      airdropped.push({
        agent: agent.displayName,
        accountId: agent.accountId,
        amount: "100.00",
      });
    }

    saveState(state);
    client.close();

    return res.json({
      success: true,
      usdc_token_id: usdcTokenId,
      total_supply: "100,000,000.00",
      decimals: 2,
      airdropped,
      total_agents: agents.length,
      explorer: `https://hashscan.io/testnet/token/${usdcTokenId}`,
    });
  } catch (err: unknown) {
    client.close();
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
