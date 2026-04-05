/**
 * POST /api/commands/minikit-dispute
 *
 * Simplified dispute resolution for minikit/World App demo.
 * Uses OpenAI directly — no 0G Compute, no Hedera HCS, no iNFT.
 * 5 agents do 2 rounds: independent research vote + discussion vote.
 *
 * Body: { "marketId": "...", "question": "..." }
 */
import type { NextApiRequest, NextApiResponse } from "next";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const AGENTS = [
  { name: "AlphaOracle", role: "macroeconomic analyst and geopolitical risk assessor" },
  { name: "BetaAnalyst", role: "quantitative data analyst focused on statistical evidence" },
  { name: "DeltaCritic", role: "contrarian that stress-tests predictions and finds counter-evidence" },
  { name: "EpsilonPolicy", role: "regulatory and policy analyst tracking government actions" },
  { name: "ZetaSentinel", role: "fact-checker verifying claims and cross-referencing sources" },
];

async function askOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 250,
      temperature: 0.7,
    }),
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "(no response)";
}

function extractVote(text: string): "YES" | "NO" {
  const upper = text.toUpperCase();
  const yesCount = (upper.match(/\bYES\b/g) || []).length;
  const noCount = (upper.match(/\bNO\b/g) || []).length;
  return yesCount >= noCount ? "YES" : "NO";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS for ngrok/Vercel cross-origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not set" });

  const { marketId, question } = req.body;
  if (!question) return res.status(400).json({ error: "question is required" });

  try {
    // ── Round 1: Independent research + vote ──
    const round1 = await Promise.all(
      AGENTS.map(async (agent) => {
        const response = await askOpenAI(
          `You are ${agent.name}, a ${agent.role} for a prediction market oracle. Be concise (3-4 sentences). End with your vote: YES or NO.`,
          `Market question: "${question}"\n\nResearch this independently. What evidence supports or contradicts this outcome? End with your final vote (YES or NO).`
        );
        return { agent: agent.name, reasoning: response, vote: extractVote(response) };
      })
    );

    const r1Yes = round1.filter((r) => r.vote === "YES").length;
    const r1No = round1.filter((r) => r.vote === "NO").length;
    const r1Pct = Math.round((Math.max(r1Yes, r1No) / AGENTS.length) * 100);

    // Check if resolved in round 1 (>=70%)
    if (r1Pct >= 70) {
      const consensus = r1Yes > r1No ? "YES" : "NO";
      return res.json({
        marketId,
        question,
        resolved: true,
        consensus,
        round1: { reveals: round1, tally: { YES: r1Yes, NO: r1No }, percentage: r1Pct },
        round2: null,
      });
    }

    // ── Round 2: Discussion + final vote ──
    const r1Summary = round1.map((r) => `[${r.agent}] voted ${r.vote}: ${r.reasoning}`).join("\n\n");

    const round2 = await Promise.all(
      AGENTS.map(async (agent) => {
        const response = await askOpenAI(
          `You are ${agent.name}, a ${agent.role}. You are in a second round of voting after seeing other agents' arguments. Be concise (2-3 sentences). End with your FINAL vote: YES or NO.`,
          `Market question: "${question}"\n\nRound 1 results (${r1Yes} YES, ${r1No} NO):\n\n${r1Summary}\n\nConsidering all arguments, what is your final vote? You may change your mind. End with YES or NO.`
        );
        return { agent: agent.name, reasoning: response, vote: extractVote(response) };
      })
    );

    const r2Yes = round2.filter((r) => r.vote === "YES").length;
    const r2No = round2.filter((r) => r.vote === "NO").length;
    const r2Pct = Math.round((Math.max(r2Yes, r2No) / AGENTS.length) * 100);
    const consensus = r2Yes > r2No ? "YES" : "NO";

    return res.json({
      marketId,
      question,
      resolved: r2Pct >= 70,
      consensus,
      round1: { reveals: round1, tally: { YES: r1Yes, NO: r1No }, percentage: r1Pct },
      round2: { reveals: round2, tally: { YES: r2Yes, NO: r2No }, percentage: r2Pct },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
