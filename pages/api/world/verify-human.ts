import type { NextApiRequest, NextApiResponse } from "next";
import { verifyWorldIDProof } from "@/lib/world-agentkit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rpId = process.env.WORLD_RP_ID;
  if (!rpId) {
    return res.status(500).json({ error: "WORLD_RP_ID not configured" });
  }

  try {
    const result = await verifyWorldIDProof(req.body, rpId);
    return res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
