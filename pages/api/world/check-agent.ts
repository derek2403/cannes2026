import type { NextApiRequest, NextApiResponse } from "next";
import { checkAgentHuman } from "@/lib/world-agentkit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { address, chainId } = req.body;

  if (!address) {
    return res.status(400).json({ error: "address is required" });
  }

  try {
    const humanId = await checkAgentHuman(address, chainId);
    return res.json({
      address,
      isHumanBacked: humanId !== null,
      humanId: humanId || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
