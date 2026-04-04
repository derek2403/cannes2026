import type { NextApiRequest, NextApiResponse } from "next";
import { readHistory } from "@/lib/agent-helpers";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  const { agent } = req.query;
  const history = readHistory();

  if (agent && typeof agent === "string") {
    return res.json({
      events: history.events.filter((e) => e.agentName === agent),
    });
  }

  return res.json(history);
}
