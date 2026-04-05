/**
 * POST /api/commands/generate-insights
 *
 * Uses OpenAI to generate a word cloud and references from agent discussion messages.
 *
 * Body: { "messages": [{ "agent": "...", "text": "..." }], "question": "..." }
 * Returns: { wordCloud: [...], references: [...] }
 */
import type { NextApiRequest, NextApiResponse } from "next";

interface WordCloudItem {
  text: string;
  size: number;
  color: string;
  weight: number;
}

interface Reference {
  id: number;
  title: string;
  url: string;
  source: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const { messages, question } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }

  const agentTexts = messages
    .map((m: { agent: string; text: string }) => `[${m.agent}]: ${m.text}`)
    .join("\n\n");

  const prompt = `You are analyzing prediction market oracle agent discussions. Given the following agent discussion messages about the question "${question || "a prediction market"}", generate two things:

1. A word cloud: Extract 40-60 key terms/concepts from the discussion. For each word, assign:
   - "text": the word or short phrase (1-2 words max)
   - "size": importance score (14-144, where 144 = most important concept discussed)
   - "color": one of these hex colors based on category:
     * "#111623" for core analysis terms
     * "#066a9c" for market/financial terms
     * "#c2410c" for risk/warning terms
     * "#28a745" for positive/bullish terms
     * "#b91c1c" for negative/bearish terms
     * "#212529" for neutral/general terms
     * "#6c757d" for secondary terms
     * "#9ca3af" for minor terms
   - "weight": 700-900

2. References: Extract or infer 4-8 references that agents cited or would have used. For each:
   - "id": sequential number
   - "title": descriptive title
   - "url": plausible URL (use real domains like reuters.com, bloomberg.com, etc.)
   - "source": source name

Agent discussions:
${agentTexts.slice(0, 3000)}

Respond ONLY with valid JSON in this exact format:
{
  "wordCloud": [{"text": "...", "size": 80, "color": "#111623", "weight": 900}, ...],
  "references": [{"id": 1, "title": "...", "url": "https://...", "source": "Reuters"}, ...]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `OpenAI error: ${err}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Failed to parse OpenAI response" });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.json({
      success: true,
      wordCloud: parsed.wordCloud || [],
      references: parsed.references || [],
    });
  } catch (err) {
    return res.status(500).json({
      error: `Failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
