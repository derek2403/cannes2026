import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Must be alphanumeric (a-z, A-Z, 0-9) and at least 8 characters
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(24);
  let nonce = "";
  for (const b of bytes) nonce += chars[b % chars.length];

  // Store nonce in httpOnly cookie for verification
  res.setHeader(
    "Set-Cookie",
    `siwe=${nonce}; HttpOnly; Path=/; SameSite=Strict; Max-Age=600`
  );

  return res.status(200).json({ nonce });
}
