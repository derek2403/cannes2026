import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  Hbar,
  PrivateKey,
  TokenType,
  TokenSupplyType,
  AccountId,
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
 * Buy YES or NO shares for a prediction market via Hedera Token Service.
 *
 * POST /api/market/buy-share
 * Body: { market_id, side: "yes"|"no", amount, buyer_account_id?, outcome_label? }
 *
 * First call auto-creates YES and NO HTS fungible tokens for that market.
 * Then mints + transfers shares to the buyer.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const {
    market_id,
    side,
    amount = "10",
    buyer_account_id,
    outcome_label,
  } = req.body;

  if (!market_id || !side) {
    return res.status(400).json({ error: "market_id and side (yes/no) required" });
  }

  const normalSide = side.toLowerCase();
  if (normalSide !== "yes" && normalSide !== "no") {
    return res.status(400).json({ error: "side must be 'yes' or 'no'" });
  }

  const state = getState();
  const operatorId = state.operatorId || process.env.HEDERA_OPERATOR_ID!;
  const operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY!);

  // Buyer defaults to operator (self-custody demo)
  const buyerAccount = buyer_account_id || operatorId;
  const buyerIsTreasury = buyerAccount === operatorId;

  const shareAmount = parseInt(amount, 10) || 10;

  try {
    const client = getClient();

    // ── Auto-create YES/NO HTS tokens if first time ─────────────
    let marketState = state.markets?.[market_id];

    if (!marketState || !marketState.yes_token_id) {
      // Create YES token
      const yesTx = await new TokenCreateTransaction()
        .setTokenName(`${market_id}_YES`)
        .setTokenSymbol(`${market_id.substring(0, 6).toUpperCase()}_Y`)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(operatorId)
        .setAdminKey(operatorKey.publicKey)
        .setSupplyKey(operatorKey.publicKey)
        .setMaxTransactionFee(new Hbar(30))
        .freezeWith(client);

      const yesSignedTx = await yesTx.sign(operatorKey);
      const yesResponse = await yesSignedTx.execute(client);
      const yesReceipt = await yesResponse.getReceipt(client);
      const yesTokenId = yesReceipt.tokenId!.toString();

      // Create NO token
      const noTx = await new TokenCreateTransaction()
        .setTokenName(`${market_id}_NO`)
        .setTokenSymbol(`${market_id.substring(0, 6).toUpperCase()}_N`)
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(TokenSupplyType.Infinite)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(operatorId)
        .setAdminKey(operatorKey.publicKey)
        .setSupplyKey(operatorKey.publicKey)
        .setMaxTransactionFee(new Hbar(30))
        .freezeWith(client);

      const noSignedTx = await noTx.sign(operatorKey);
      const noResponse = await noSignedTx.execute(client);
      const noReceipt = await noResponse.getReceipt(client);
      const noTokenId = noReceipt.tokenId!.toString();

      // Save to state
      if (!state.markets) state.markets = {};
      state.markets[market_id] = {
        ...(state.markets[market_id] || {}),
        yes_token_id: yesTokenId,
        no_token_id: noTokenId,
        outcome_label: outcome_label || market_id,
        created_at: new Date().toISOString(),
        total_yes_minted: 0,
        total_no_minted: 0,
      };
      saveState(state);

      marketState = state.markets[market_id];
    }

    const tokenId =
      normalSide === "yes" ? marketState.yes_token_id : marketState.no_token_id;

    // ── Mint new shares (supply key = operator) ─────────────────
    const mintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setAmount(shareAmount)
      .setMaxTransactionFee(new Hbar(5))
      .freezeWith(client);

    const mintSignedTx = await mintTx.sign(operatorKey);
    const mintResponse = await mintSignedTx.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);

    let transferTxId: string | null = null;

    // ── Transfer to buyer (if not the treasury) ─────────────────
    if (!buyerIsTreasury) {
      // Associate token with buyer first (ignore if already associated)
      try {
        const assocTx = await new TokenAssociateTransaction()
          .setAccountId(buyerAccount)
          .setTokenIds([tokenId])
          .setMaxTransactionFee(new Hbar(5))
          .freezeWith(client);

        // If buyer is a per-agent account, we'd need their key.
        // For demo, buyer must be operator or pre-associated.
        const assocSignedTx = await assocTx.sign(operatorKey);
        const assocResponse = await assocSignedTx.execute(client);
        await assocResponse.getReceipt(client);
      } catch {
        // TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT — safe to ignore
      }

      const transferTx = await new TransferTransaction()
        .addTokenTransfer(tokenId, operatorId, -shareAmount)
        .addTokenTransfer(tokenId, buyerAccount, shareAmount)
        .setMaxTransactionFee(new Hbar(5))
        .freezeWith(client);

      const transferSignedTx = await transferTx.sign(operatorKey);
      const transferResponse = await transferSignedTx.execute(client);
      await transferResponse.getReceipt(client);
      transferTxId = transferResponse.transactionId.toString();
    }

    client.close();

    // ── Update totals in state ──────────────────────────────────
    const freshState = getState();
    const ms = freshState.markets[market_id];
    if (normalSide === "yes") {
      ms.total_yes_minted = (ms.total_yes_minted || 0) + shareAmount;
    } else {
      ms.total_no_minted = (ms.total_no_minted || 0) + shareAmount;
    }
    saveState(freshState);

    const totalYes = ms.total_yes_minted || 0;
    const totalNo = ms.total_no_minted || 0;
    const total = totalYes + totalNo || 1;

    return res.status(200).json({
      success: true,
      market_id,
      side: normalSide,
      amount: shareAmount,
      buyer: buyerAccount,
      token_id: tokenId,
      token_name: `${market_id}_${normalSide.toUpperCase()}`,
      mint_status: mintReceipt.status.toString(),
      transfer_tx: transferTxId,
      pool: {
        yes_token_id: marketState.yes_token_id,
        no_token_id: marketState.no_token_id,
        total_yes: totalYes,
        total_no: totalNo,
        yes_percent: Math.round((totalYes / total) * 100),
        no_percent: Math.round((totalNo / total) * 100),
      },
      explorer: {
        token: `https://hashscan.io/testnet/token/${tokenId}`,
        yes_token: `https://hashscan.io/testnet/token/${marketState.yes_token_id}`,
        no_token: `https://hashscan.io/testnet/token/${marketState.no_token_id}`,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
