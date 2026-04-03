import type { NextApiRequest, NextApiResponse } from "next";
import {
  TokenCreateTransaction,
  Hbar,
  PrivateKey,
  TokenType,
  TokenSupplyType,
} from "@hashgraph/sdk";
import { getClient } from "@/lib/hedera";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = getClient();
    const {
      tokenName = "TestToken",
      tokenSymbol = "TT",
      initialSupply = 1000,
      decimals = 2,
    } = req.body;

    // Use the operator account as treasury
    const operatorId = process.env.HEDERA_OPERATOR_ID!;
    const operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY!);

    const tx = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyType(TokenSupplyType.Infinite)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply)
      .setTreasuryAccountId(operatorId)
      .setAdminKey(operatorKey.publicKey)
      .setSupplyKey(operatorKey.publicKey)
      .setMaxTransactionFee(new Hbar(30))
      .freezeWith(client);

    const signedTx = await tx.sign(operatorKey);
    const txResponse = await signedTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const tokenId = receipt.tokenId;

    client.close();

    return res.status(200).json({
      tokenId: tokenId?.toString(),
      tokenName,
      tokenSymbol,
      initialSupply,
      decimals,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
