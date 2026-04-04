import type { NextApiRequest, NextApiResponse } from "next";
import { checkAgentHuman } from "@/lib/world-agentkit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "address is required" });
  }

  try {
    const steps: { step: string; status: string; detail: string }[] = [];

    // Step 1: Call AgentBook contract on World Chain
    steps.push({
      step: "AgentBook Lookup",
      status: "running",
      detail: `Calling lookupHuman(${address}) on World Chain contract 0xA23a...`,
    });

    const humanId = await checkAgentHuman(address);

    // Step 2: Evaluate result
    if (!humanId) {
      steps[0].status = "done";
      steps[0].detail = `lookupHuman returned 0 — no human linked`;
      steps.push({
        step: "Verification",
        status: "failed",
        detail: "Wallet not registered on AgentBook. No World ID proof tied to this agent.",
      });

      return res.status(403).json({
        verified: false,
        address,
        humanId: null,
        steps,
      });
    }

    steps[0].status = "done";
    steps[0].detail = `lookupHuman returned humanId: ${humanId}`;
    steps.push({
      step: "Verification",
      status: "passed",
      detail: `Wallet is backed by verified human. Anonymous humanId: ${humanId}`,
    });

    return res.json({
      verified: true,
      address,
      humanId,
      steps,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
