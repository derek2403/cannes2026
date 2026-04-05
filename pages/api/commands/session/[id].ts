import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SESSIONS_DIR = join(process.cwd(), "data", "sessions");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const { id } = req.query;
  if (!id || typeof id !== "string") return res.status(400).json({ error: "Missing session id" });

  const filePath = join(SESSIONS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return res.status(404).json({ error: `Session ${id} not found` });

  const session = JSON.parse(readFileSync(filePath, "utf-8"));
  return res.json(session);
}
