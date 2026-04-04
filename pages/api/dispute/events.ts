import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marketId, cursor = 0 } = req.body;
  if (!marketId) {
    return res.status(400).json({ error: "marketId is required" });
  }

  const eventsPath = path.join(
    process.cwd(),
    "data",
    `dispute-events-${marketId}.jsonl`
  );

  if (!fs.existsSync(eventsPath)) {
    return res.status(200).json({ events: [], cursor: 0, done: false });
  }

  const content = fs.readFileSync(eventsPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  // Return events after cursor position
  const newEvents = lines.slice(cursor).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return {
        ts: new Date().toISOString(),
        phase: "error",
        type: "error",
        agent: "system",
        message: "Malformed event line",
        data: {},
      };
    }
  });

  const newCursor = lines.length;
  const done = newEvents.some(
    (e: { phase: string }) => e.phase === "done"
  );

  return res.status(200).json({
    events: newEvents,
    cursor: newCursor,
    done,
  });
}
