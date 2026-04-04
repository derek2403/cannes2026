import type { NextApiRequest, NextApiResponse } from "next";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { payload, nonce } = req.body;

  if (!payload || !nonce) {
    return res.status(400).json({ isValid: false, error: "Missing payload or nonce" });
  }

  try {
    // verifySiweMessage defaults to World Chain mainnet client (walletAuth signs on mainnet)
    const verification = await verifySiweMessage(payload, nonce);

    return res.status(200).json({
      isValid: verification.isValid,
      address: verification.siweMessageData.address,
    });
  } catch (error) {
    return res.status(400).json({
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
