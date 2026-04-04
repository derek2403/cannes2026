#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  Agent Orchestrator — The Brain
 *
 *  Runs alongside `npm run dev`. Pings agents periodically,
 *  creates markets via multi-round discussion, and handles
 *  disputes when triggered.
 *
 *  Usage:
 *    node server/server.mjs
 *
 *  The orchestrator:
 *    - Runs on port 3001
 *    - Every MARKET_INTERVAL_MS, agents discuss and create a market
 *    - POST /dispute/:marketId  → runs resolve-1 then resolve-2
 *    - GET  /status             → shows orchestrator state
 *    - GET  /agents             → lists registered agents
 *    - POST /create-market      → manually trigger market creation
 * ═══════════════════════════════════════════════════════════════
 */
import http from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Config ──────────────────────────────────────────────────────
const PLATFORM = "http://localhost:3000";
const PORT = 3001;
const MARKET_INTERVAL_MS = 5 * 60 * 1000; // create market every 5 min

// ── State ───────────────────────────────────────────────────────
let agents = [];
let walletAddress = "";
let isRunning = false;
let marketCount = 0;
let lastMarketAt = null;
let conversationLog = []; // live conversation feed

// ── Colors for terminal ─────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m",
};

function log(agent, msg) {
  const ts = new Date().toLocaleTimeString();
  const entry = { ts, agent, msg };
  conversationLog.push(entry);
  // Keep last 200 messages
  if (conversationLog.length > 200) conversationLog.shift();

  const agentColor =
    agent === "system"
      ? c.cyan
      : agent === "ResearchBot"
        ? c.green
        : agent === "CritiqueBot"
          ? c.red
          : agent === "MarketBot"
            ? c.yellow
            : c.magenta;

  console.log(
    `${c.dim}[${ts}]${c.reset} ${agentColor}${c.bold}${agent}${c.reset}: ${msg}`
  );
}

// ── Platform API helpers ────────────────────────────────────────
async function api(path, body) {
  const res = await fetch(`${PLATFORM}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${PLATFORM}${path}`);
  return res.json();
}

async function callAgent(tokenId, message) {
  const data = await api("/api/inft/infer", {
    tokenId,
    message,
    userAddress: walletAddress,
    maxTokens: 600,
  });
  return data.response || data.error || "No response";
}

// ── Load agents from platform ───────────────────────────────────
async function loadAgents() {
  try {
    const state = await apiGet("/api/agents/state");
    agents = (state.agents || []).filter((a) => a.inftTokenId != null);
    log("system", `Loaded ${agents.length} minted agents: ${agents.map((a) => a.displayName).join(", ")}`);
  } catch (err) {
    log("system", `Failed to load agents: ${err.message}`);
  }
}

async function loadWallet() {
  try {
    const data = await api("/api/inft/wallet-address", {});
    walletAddress = data.address;
    log("system", `Server wallet: ${walletAddress.slice(0, 8)}...`);
  } catch (err) {
    log("system", `Failed to get wallet: ${err.message}`);
  }
}

// ═════════════════════════════════════════════════════════════════
//  MARKET CREATION — Multi-round agent conversation
// ═════════════════════════════════════════════════════════════════
async function createMarketDiscussion() {
  if (agents.length < 2) {
    log("system", "Need at least 2 agents to create a market. Skipping.");
    return null;
  }

  log("system", "═══ MARKET CREATION SESSION STARTED ═══");

  const themes = [
    "AI technology milestones and regulation in 2026",
    "cryptocurrency and DeFi developments",
    "geopolitical events and their market impact",
    "climate policy and energy markets",
    "space exploration and commercial space industry",
    "global economic indicators and central bank decisions",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  log("system", `Theme: "${theme}"`);

  // Build conversation history that all agents can see
  const conversation = [];

  // ── Round 1: Each agent proposes (sequentially, seeing previous proposals) ──
  log("system", "── Round 1: Proposals ──");

  for (const agent of agents) {
    const prevProposals =
      conversation.length > 0
        ? `\n\nPrevious proposals from other agents:\n${conversation.map((m) => `[${m.agent}]: ${m.text}`).join("\n\n")}`
        : "";

    const today = new Date().toISOString().split("T")[0];
    const prompt = `You are ${agent.displayName} in a group discussion about creating a prediction market.
Theme: "${theme}"
Today's date is ${today}.
${prevProposals}

Propose ONE specific binary (YES/NO) prediction market question. It must:
- Be resolvable within 6 months from today (dates must be in 2026 or later, NEVER 2024 or 2025)
- Have clear resolution criteria
- Be interesting for traders
- Be grounded in REAL current events — cite at least one news source or reference URL

Keep it to 2-3 sentences: the question, the resolution date, how it resolves, and your reference URLs.`;

    const response = await callAgent(agent.inftTokenId, prompt);
    conversation.push({
      round: 1,
      agent: agent.displayName,
      tokenId: agent.inftTokenId,
      text: response,
    });
    log(agent.displayName, response.slice(0, 200) + (response.length > 200 ? "..." : ""));
  }

  // ── Round 2: Discussion (each agent sees all proposals + previous discussion) ──
  log("system", "── Round 2: Discussion ──");

  for (const agent of agents) {
    const fullConvo = conversation
      .map((m) => `[${m.agent} — Round ${m.round}]: ${m.text}`)
      .join("\n\n");

    const prompt = `You are ${agent.displayName}. You're discussing which prediction market to create.
Today's date is ${new Date().toISOString().split("T")[0]}.

Full conversation so far:
${fullConvo}

React to the other agents' proposals and discussion:
1. Which proposal do you like best and why? Verify their references.
2. Challenge any weak proposals — are the references valid? Are the dates correct (must be 2026+)?
3. Suggest improvements if needed, cite additional references.

Be direct and reference other agents by name. Keep it concise (3-4 sentences).`;

    const response = await callAgent(agent.inftTokenId, prompt);
    conversation.push({
      round: 2,
      agent: agent.displayName,
      tokenId: agent.inftTokenId,
      text: response,
    });
    log(agent.displayName, response.slice(0, 200) + (response.length > 200 ? "..." : ""));
  }

  // ── Round 3: Final vote ──
  log("system", "── Round 3: Vote ──");

  const votes = {};
  for (const agent of agents) {
    const fullConvo = conversation
      .map((m) => `[${m.agent} — Round ${m.round}]: ${m.text}`)
      .join("\n\n");

    const prompt = `You are ${agent.displayName}. Final vote on which market to create.
Today's date is ${new Date().toISOString().split("T")[0]}.

Full conversation:
${fullConvo}

Pick the BEST proposal. Ensure the resolution date is in 2026 or later. Reply with ONLY a JSON object:
{"pick": "AgentName", "question": "the exact market question", "resolution_date": "YYYY-MM-DD", "resolution_criteria": "how it resolves", "references": ["https://...", "https://..."]}`;

    const response = await callAgent(agent.inftTokenId, prompt);
    conversation.push({
      round: 3,
      agent: agent.displayName,
      tokenId: agent.inftTokenId,
      text: response,
    });
    log(agent.displayName, response.slice(0, 200) + (response.length > 200 ? "..." : ""));

    // Parse vote
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const pick = parsed.pick || agent.displayName;
        votes[pick] = votes[pick] || { count: 0, data: parsed };
        votes[pick].count++;
      }
    } catch {
      // couldn't parse vote
    }
  }

  // ── Determine winner and create market ──
  let winner = null;
  let maxVotes = 0;
  for (const [name, v] of Object.entries(votes)) {
    if (v.count > maxVotes) {
      maxVotes = v.count;
      winner = { agent: name, ...v.data };
    }
  }

  if (!winner || !winner.question) {
    log("system", "Could not determine winning market. Using fallback.");
    // Use first agent's round-1 proposal
    const firstProposal = conversation.find((m) => m.round === 1);
    winner = {
      question: firstProposal?.text?.slice(0, 200) || `Prediction about ${theme}`,
      resolution_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      resolution_criteria: "Resolved by AI oracle swarm consensus.",
    };
  }

  // Create the market via platform API
  const result = await api("/api/commands/create-market", { theme });

  if (result.success) {
    marketCount++;
    lastMarketAt = new Date().toISOString();
    log("system", `═══ MARKET CREATED: ${result.marketId} ═══`);
    log("system", `Question: ${result.question}`);
  } else {
    log("system", `Market creation failed: ${result.error || "unknown"}`);
  }

  return result;
}

// ═════════════════════════════════════════════════════════════════
//  DISPUTE RESOLUTION — Commit-Reveal (HCS-16 Flora pattern)
//
//  Phase 1 Commit  → Phase 1 Reveal → (no consensus?)
//  → Discussion    → Phase 2 Commit → Phase 2 Reveal
// ═════════════════════════════════════════════════════════════════
async function runDispute(marketId) {
  log("system", `═══ DISPUTE STARTED: ${marketId} ═══`);

  // ── Phase 1: Commit-Reveal ────────────────────────────────────
  log("system", "── Phase 1 Commit: Agents researching & sealing votes ──");
  const r1 = await api("/api/commands/resolve-1", { marketId });

  // Log commit hashes
  if (r1.phases) {
    const commitPhase = r1.phases.find((p) => p.phase === "phase_1_commit");
    if (commitPhase?.commits) {
      for (const c of commitPhase.commits) {
        log(c.agent, `Committed: ${c.commitHash.slice(0, 16)}...`);
      }
    }

    // Log reveals
    log("system", "── Phase 1 Reveal: Unsealing votes ──");
    const revealPhase = r1.phases.find((p) => p.phase === "phase_1_reveal");
    if (revealPhase?.reveals) {
      for (const r of revealPhase.reveals) {
        log(r.agent, `Vote: ${r.vote} | verified: ${r.verified ? "✓" : "✗"}`);
      }
    }
  }

  log("system", `Tally: YES=${r1.tally?.YES} NO=${r1.tally?.NO} `);

  if (r1.resolved) {
    log("system", `═══ RESOLVED at Phase 1 Reveal: ${r1.consensus} (${r1.percentages?.[r1.consensus]}) ═══`);
    if (r1.reputationUpdates) {
      for (const u of r1.reputationUpdates) {
        log(u.agent, `REP ${u.change >= 0 ? "+" : ""}${u.change} → ${u.newRep} (${u.correct ? "correct" : "wrong"})`);
      }
    }
    return r1;
  }

  log("system", "No 70% consensus at Phase 1. Moving to Discussion + Phase 2...");

  // ── Phase 2: Discussion + Commit-Reveal ───────────────────────
  log("system", "── Discussion: Agents presenting views ──");
  const r2 = await api("/api/commands/resolve-2", { marketId });

  if (r2.phases) {
    // Discussion round 1
    const disc1 = r2.phases.find((p) => p.phase === "discussion_round_1");
    if (disc1?.views) {
      for (const v of disc1.views) {
        log(v.agent, v.view.slice(0, 150) + (v.view.length > 150 ? "..." : ""));
      }
    }

    // Discussion round 2
    const disc2 = r2.phases.find((p) => p.phase === "discussion_round_2");
    if (disc2?.responses) {
      log("system", "── Discussion: Agents responding to each other ──");
      for (const r of disc2.responses) {
        log(r.agent, r.response.slice(0, 150) + (r.response.length > 150 ? "..." : ""));
      }
    }

    // Phase 2 commit
    const commit2 = r2.phases.find((p) => p.phase === "phase_2_commit");
    if (commit2?.commits) {
      log("system", "── Phase 2 Commit: Agents sealing post-discussion votes ──");
      for (const c of commit2.commits) {
        log(c.agent, `Committed: ${c.commitHash.slice(0, 16)}...`);
      }
    }

    // Phase 2 reveal
    const reveal2 = r2.phases.find((p) => p.phase === "phase_2_reveal");
    if (reveal2?.reveals) {
      log("system", "── Phase 2 Reveal: Unsealing votes ──");
      for (const r of reveal2.reveals) {
        log(r.agent, `Vote: ${r.vote} | verified: ${r.verified ? "✓" : "✗"}`);
      }
    }
  }

  log("system", `Tally: YES=${r2.tally?.YES} NO=${r2.tally?.NO} `);

  if (r2.resolved) {
    log("system", `═══ RESOLVED at Phase 2 Reveal: ${r2.consensus} (${r2.percentages?.[r2.consensus]}) ═══`);
    if (r2.reputationUpdates) {
      for (const u of r2.reputationUpdates) {
        log(u.agent, `REP ${u.change >= 0 ? "+" : ""}${u.change} → ${u.newRep} (${u.correct ? "correct" : "wrong"})`);
      }
    }
  } else {
    log("system", `═══ NO CONSENSUS — ${r2.message} ═══`);
  }

  return r2;
}

// ═════════════════════════════════════════════════════════════════
//  HTTP SERVER
// ═════════════════════════════════════════════════════════════════
function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (method === "OPTIONS") {
    res.writeHead(200);
    return res.end();
  }

  const json = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
  };

  try {
    // GET /status
    if (path === "/status" && method === "GET") {
      return json({
        running: isRunning,
        agents: agents.map((a) => ({
          name: a.displayName,
          tokenId: a.inftTokenId,
        })),
        marketCount,
        lastMarketAt,
        uptime: process.uptime(),
        nextMarketIn: isRunning
          ? `${Math.round(MARKET_INTERVAL_MS / 1000)}s cycle`
          : "paused",
      });
    }

    // GET /agents
    if (path === "/agents" && method === "GET") {
      await loadAgents();
      return json({ agents });
    }

    // GET /log — recent conversation
    if (path === "/log" && method === "GET") {
      return json({ log: conversationLog.slice(-50) });
    }

    // POST /create-market — manual trigger
    if (path === "/create-market" && method === "POST") {
      if (agents.length < 2) {
        return json({ error: "Need at least 2 minted agents" }, 400);
      }
      const result = await createMarketDiscussion();
      return json(result || { error: "Failed" });
    }

    // POST /dispute/:marketId
    const disputeMatch = path.match(/^\/dispute\/(.+)$/);
    if (disputeMatch && method === "POST") {
      const marketId = disputeMatch[1];
      const result = await runDispute(marketId);
      return json(result);
    }

    // 404
    json(
      {
        error: "Not found",
        endpoints: {
          "GET /status": "Orchestrator status",
          "GET /agents": "List agents",
          "GET /log": "Recent conversation log",
          "POST /create-market": "Trigger market creation",
          "POST /dispute/:marketId": "Run dispute resolution",
        },
      },
      404
    );
  } catch (err) {
    log("system", `Error: ${err.message}`);
    json({ error: err.message }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════
//  STARTUP
// ═════════════════════════════════════════════════════════════════
async function start() {
  console.log(`
${c.cyan}${c.bold}═══════════════════════════════════════════════════${c.reset}
${c.cyan}${c.bold}  Agent Orchestrator${c.reset}
${c.cyan}${c.bold}  Port: ${PORT}  |  Platform: ${PLATFORM}${c.reset}
${c.cyan}${c.bold}  Market interval: ${MARKET_INTERVAL_MS / 1000}s${c.reset}
${c.cyan}${c.bold}═══════════════════════════════════════════════════${c.reset}
`);

  // Check platform is up
  try {
    await fetch(PLATFORM);
  } catch {
    console.log(`${c.red}Platform not running at ${PLATFORM}. Start with: npm run dev${c.reset}`);
    process.exit(1);
  }

  await loadWallet();
  await loadAgents();

  if (agents.length === 0) {
    console.log(`${c.yellow}No minted agents found. Create some first:${c.reset}`);
    console.log(`  ./scripts/spin-up-agents.sh`);
    console.log(`  ${c.dim}or${c.reset}`);
    console.log(`  curl -X POST ${PLATFORM}/api/commands/create-agent -H "Content-Type: application/json" -d '{"agentName":"Bot1","modelProvider":"0g-compute","systemPrompt":"You are a research agent."}'`);
    console.log(`\n${c.yellow}Orchestrator will wait for agents...${c.reset}\n`);
  }

  server.listen(PORT, () => {
    log("system", `Orchestrator listening on http://localhost:${PORT}`);
  });

  isRunning = true;

  // ── Market creation loop ──────────────────────────────────────
  async function tick() {
    await loadAgents(); // refresh agent list
    if (agents.length >= 2) {
      try {
        await createMarketDiscussion();
      } catch (err) {
        log("system", `Market creation error: ${err.message}`);
      }
    } else {
      log("system", `Waiting for agents (have ${agents.length}, need 2+)...`);
    }
  }

  // First market creation after 10s warmup
  setTimeout(async () => {
    await tick();
    // Then every MARKET_INTERVAL_MS
    setInterval(tick, MARKET_INTERVAL_MS);
  }, 10000);
}

start();
