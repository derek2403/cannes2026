import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const MARKETS_FILE = join(process.cwd(), "data", "markets.json");

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!existsSync(MARKETS_FILE)) {
      return res.json([]);
    }
    const markets = JSON.parse(readFileSync(MARKETS_FILE, "utf-8"));
    return res.json(markets);
  } catch {
    return res.json([]);
  }
}
