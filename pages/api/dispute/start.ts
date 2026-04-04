import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Track running disputes in-memory to prevent duplicates
const runningDisputes = new Map<string, { pid: number; startedAt: string }>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { marketId } = req.body;
  if (!marketId || typeof marketId !== "string") {
    return res.status(400).json({ error: "marketId is required" });
  }

  // Check if dispute already running
  if (runningDisputes.has(marketId)) {
    return res.status(409).json({
      error: "Dispute already in progress",
      disputeId: marketId,
      pid: runningDisputes.get(marketId)!.pid,
    });
  }

  // Verify market exists
  const marketsPath = path.join(process.cwd(), "data", "markets.json");
  if (!fs.existsSync(marketsPath)) {
    return res.status(404).json({ error: "No markets data found" });
  }

  const markets = JSON.parse(fs.readFileSync(marketsPath, "utf-8"));
  const market = markets.find((m: { id: string }) => m.id === marketId);
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }

  // Clear any previous events file
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const eventsPath = path.join(dataDir, `dispute-events-${marketId}.jsonl`);
  fs.writeFileSync(eventsPath, "", "utf-8");

  // Spawn shell script
  const scriptPath = path.join(process.cwd(), "scripts", "run-dispute.sh");
  const child = spawn("bash", [scriptPath, marketId], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  runningDisputes.set(marketId, {
    pid: child.pid!,
    startedAt: new Date().toISOString(),
  });

  child.on("exit", (code) => {
    runningDisputes.delete(marketId);
    // Append a final "done" event if the script didn't write one (e.g. crash)
    try {
      const content = fs.readFileSync(eventsPath, "utf-8");
      if (!content.includes('"phase":"done"')) {
        const doneEvent = JSON.stringify({
          ts: new Date().toISOString(),
          phase: "done",
          type: code === 0 ? "result" : "error",
          agent: "system",
          message:
            code === 0
              ? "Dispute process completed"
              : `Dispute process exited with code ${code}`,
          data: { exitCode: code },
        });
        fs.appendFileSync(eventsPath, doneEvent + "\n");
      }
    } catch {
      // Events file may not exist if script failed very early
    }
  });

  return res.status(200).json({
    disputeId: marketId,
    status: "started",
    pid: child.pid,
    eventsEndpoint: `/api/dispute/events?marketId=${marketId}&cursor=0`,
  });
}
