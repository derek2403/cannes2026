import type { NextApiRequest, NextApiResponse } from "next";
import {
  AccountCreateTransaction,
  Hbar,
  PrivateKey,
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
    const { initialBalance = 10 } = req.body;

    // Generate new ECDSA key pair
    const newPrivateKey = PrivateKey.generateECDSA();
    const newPublicKey = newPrivateKey.publicKey;

    // Create the account
    const tx = new AccountCreateTransaction()
      .setKey(newPublicKey)
      .setInitialBalance(new Hbar(initialBalance));

    const txResponse = await tx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const newAccountId = receipt.accountId;

    client.close();

    return res.status(200).json({
      accountId: newAccountId?.toString(),
      publicKey: newPublicKey.toStringDer(),
      privateKey: newPrivateKey.toStringDer(),
      evmAddress: newPublicKey.toEvmAddress(),
      initialBalance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
