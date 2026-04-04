import type { NextApiRequest, NextApiResponse } from "next";
import { generateRpContext } from "@/lib/world-agentkit";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body;

  try {
    const rpContext = generateRpContext(action || "verify-oracle");
    return res.json(rpContext);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
