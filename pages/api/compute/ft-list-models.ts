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

    const models = await broker.fineTuning.listModel();

    return res.status(200).json({
      success: true,
      models,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: msg });
  }
}
