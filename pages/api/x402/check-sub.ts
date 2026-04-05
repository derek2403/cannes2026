/**
 * GET /api/x402/check-sub?id=sub-xxx
 *
 * Lightweight check: is this Hedera subscription still active?
 * Called internally by middleware.ts to bypass x402 for subscribed agents.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SUBS_PATH = join(process.cwd(), "data", "x402-subscriptions.json");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;
  if (!id) return res.json({ valid: false });

  if (!existsSync(SUBS_PATH)) return res.json({ valid: false });

  const subs = JSON.parse(readFileSync(SUBS_PATH, "utf-8"));
  const sub = subs.subscriptions?.find((s: { id: string }) => s.id === id);
  if (!sub) return res.json({ valid: false });

  const active = new Date(sub.expires_at) > new Date();
  return res.json({
    valid: active,
    expires_at: sub.expires_at,
    payer: sub.payer_account_id,
    schedule_id: sub.schedule_id,
  });
}
