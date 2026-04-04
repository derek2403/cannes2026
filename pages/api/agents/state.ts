import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const STATE_FILE = path.join(process.cwd(), "hedera-state.json");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  if (!fs.existsSync(STATE_FILE)) {
    return res.json({ agents: [] });
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  return res.json(state);
}
