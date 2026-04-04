import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const privateKey = process.env.ZG_STORAGE_PRIVATE_KEY;
  if (!privateKey) {
    return res
      .status(500)
      .json({ error: "ZG_STORAGE_PRIVATE_KEY not configured" });
  }

  try {
    const wallet = new ethers.Wallet(privateKey);
    return res.json({ success: true, address: wallet.address });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
