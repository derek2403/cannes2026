import type { NextApiRequest, NextApiResponse } from "next";
import { getComputeBroker } from "@/lib/0g-compute";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const broker = await getComputeBroker();
    if (!broker.fineTuning) {
      return res
        .status(500)
        .json({ success: false, error: "Fine-tuning broker not available" });
    }

    const services = await broker.fineTuning.listService(true);

    const formatted = services.map((s) => ({
      provider: s.provider,
      url: s.url,
      pricePerToken: s.pricePerToken.toString(),
      models: s.models,
      occupied: s.occupied,
      teeSignerAcknowledged: s.teeSignerAcknowledged,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      services: formatted,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: msg });
  }
}
