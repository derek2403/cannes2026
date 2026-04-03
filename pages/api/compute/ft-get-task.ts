import type { NextApiRequest, NextApiResponse } from "next";
import { getComputeBroker } from "@/lib/0g-compute";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { provider: providerAddress, taskId, action } = req.body;

  if (!providerAddress) {
    return res.status(400).json({ error: "provider is required" });
  }

  try {
    const broker = await getComputeBroker();
    if (!broker.fineTuning) {
      return res
        .status(500)
        .json({ success: false, error: "Fine-tuning broker not available" });
    }

    if (action === "list") {
      const tasks = await broker.fineTuning.listTask(providerAddress);
      const formatted = tasks.map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        progress: t.progress,
        datasetHash: t.datasetHash,
        preTrainedModelHash: t.preTrainedModelHash,
        fee: t.fee,
      }));
      return res.status(200).json({
        success: true,
        tasks: formatted,
      });
    }

    if (action === "log") {
      const log = await broker.fineTuning.getLog(providerAddress, taskId);
      return res.status(200).json({
        success: true,
        log,
      });
    }

    // Default: get single task status
    const task = await broker.fineTuning.getTask(providerAddress, taskId);
    return res.status(200).json({
      success: true,
      task: {
        id: task.id,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        progress: task.progress,
        datasetHash: task.datasetHash,
        preTrainedModelHash: task.preTrainedModelHash,
        fee: task.fee,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: msg });
  }
}
