import type { NextApiRequest, NextApiResponse } from "next";
import { signRequest } from "@worldcoin/idkit-core/signing";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body;

  if (!action) {
    return res.status(400).json({ error: "Missing action" });
  }

  const signingKey = process.env.RP_SIGNING_KEY;
  if (!signingKey) {
    return res.status(500).json({ error: "RP_SIGNING_KEY not configured" });
  }

  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex: signingKey,
    action,
  });

  return res.status(200).json({
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
  });
}
