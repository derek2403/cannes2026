import Head from "next/head";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/header/Header";
import { Roboto, Figtree } from "next/font/google";
import { useRouter } from "next/router";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const figtree = Figtree({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-figtree",
});

/* ── types ───────────────────────────────────────────────── */

interface AgentData {
  displayName: string;
  accountId: string;
  evmAddress?: string;
  reputation?: number;
  domainTags?: string;
  serviceOfferings?: string;
  worldVerified?: boolean;
  humanId?: string | null;
  inftTokenId?: number;
  modelProvider?: string;
  usdcEarnings?: string;
}

interface HistoryEvent {
  type: "market_created" | "dispute_vote" | "reputation_change" | "usdc_payout";
  timestamp: string;
  agentName: string;
  marketId: string;
  marketQuestion?: string;
  vote?: string;
  outcome?: string;
  correct?: boolean;
  repChange?: number;
  earned?: string;
  phase?: string;
  role?: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  accountId: string;
  reputation: number;
  usdcEarnings: string;
  isMe: boolean;
}

/* ── animated counter hook ────────────────────────────────── */

function useCounter(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    started.current = false;
  }, [target]);
  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

/* ── helpers ──────────────────────────────────────────────── */

function badge(type: string) {
  const map: Record<string, string> = {
    market_created: "font-[family-name:var(--font-roboto)] font-[600] text-[#495057] bg-gray-100 border border-gray-200",
    dispute_vote: "font-[family-name:var(--font-roboto)] font-[600] text-[#5c6d7a] bg-[#e8eef2] border border-[#b8c5d0]",
    reputation_change: "font-[family-name:var(--font-roboto)] font-[600] text-[#495057] bg-gray-100 border border-gray-200",
    usdc_payout: "font-[family-name:var(--font-roboto)] font-[600] text-[#495057] bg-gray-100 border border-gray-200",
  };
  return map[type] ?? map.dispute_vote;
}

function badgeLabel(type: string) {
  const map: Record<string, string> = {
    market_created: "create",
    dispute_vote: "vote",
    reputation_change: "rep",
    usdc_payout: "payout",
  };
  return map[type] ?? type;
}

function resultColor(event: HistoryEvent) {
  if (event.type === "reputation_change") {
    return event.correct ? "text-emerald-600" : "text-red-500";
  }
  return "text-gray-500";
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const LEADERBOARD_AVATAR_BG = "#6b7280";

/* ── component ────────────────────────────────────────────── */

export default function Dash() {
  const router = useRouter();
  const { accountId: qAccountId, name: qName } = router.query;

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [allAgents, setAllAgents] = useState<AgentData[]>([]);
  const [allHistory, setAllHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState<"all" | "market_created" | "dispute_vote" | "reputation_change" | "usdc_payout">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const stateRes = await fetch("/api/agents/state");
      const state = await stateRes.json();
      const usdcEarnings: Record<string, string> = state.usdc_earnings || {};
      const agents: AgentData[] = (state.agents || []).map((a: AgentData) => ({
        ...a,
        usdcEarnings: usdcEarnings[a.displayName] || "0.00",
      }));
      setAllAgents(agents);

      let found: AgentData | null = null;
      if (qAccountId && typeof qAccountId === "string") {
        found = agents.find((a) => a.accountId === qAccountId) || null;
      } else if (qName && typeof qName === "string") {
        found = agents.find((a) => a.displayName.toLowerCase() === qName.toLowerCase()) || null;
      }
      if (!found && agents.length > 0) {
        found = agents[0];
      }
      setAgent(found);

      // Fetch all history (for leaderboard earnings)
      const allHistRes = await fetch("/api/agents/history");
      const allHist = await allHistRes.json();
      setAllHistory(allHist.events || []);

      if (found) {
        const agentEvents = (allHist.events || []).filter((e: HistoryEvent) => e.agentName === found!.displayName);
        setEvents(agentEvents.reverse());
      }
    } catch { /* empty */ }
    setLoading(false);
  }, [qAccountId, qName]);

  useEffect(() => {
    if (router.isReady) fetchData();
  }, [router.isReady, fetchData]);

  // Computed stats
  const reputation = agent?.reputation ?? 10;
  const repMax = 100;
  const totalVotes = events.filter((e) => e.type === "dispute_vote").length;
  const repEvents = events.filter((e) => e.type === "reputation_change");
  const correctVotes = repEvents.filter((e) => e.correct).length;
  const wrongVotes = repEvents.filter((e) => !e.correct).length;
  const accuracy = totalVotes > 0 ? Math.round((correctVotes / Math.max(correctVotes + wrongVotes, 1)) * 1000) / 10 : 0;
  const marketsCreated = events.filter((e) => e.type === "market_created").length;
  const totalRepGain = repEvents.filter((e) => (e.repChange ?? 0) > 0).reduce((s, e) => s + (e.repChange ?? 0), 0);
  const totalRepLoss = repEvents.filter((e) => (e.repChange ?? 0) < 0).reduce((s, e) => s + Math.abs(e.repChange ?? 0), 0);

  // Leaderboard from all agents
  // Compute per-agent earnings from history
  const agentEarningsMap: Record<string, number> = {};
  allHistory.filter((e) => e.type === "reputation_change" && e.correct).forEach((e) => {
    agentEarningsMap[e.agentName] = (agentEarningsMap[e.agentName] || 0) + 10;
  });

  const leaderboard: LeaderboardEntry[] = allAgents
    .map((a) => ({ name: a.displayName, accountId: a.accountId, reputation: a.reputation ?? 10, usdcEarnings: (agentEarningsMap[a.displayName] || 0).toFixed(2), isMe: a.accountId === agent?.accountId }))
    .sort((a, b) => b.reputation - a.reputation)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  const myRank = leaderboard.find((a) => a.isMe)?.rank ?? 0;

  const filtered = logFilter === "all" ? events : events.filter((e) => e.type === logFilter);

  const repCount = useCounter(reputation);
  const accCount = useCounter(Math.round(accuracy * 10));

  const anim = (i: number) =>
    mounted
      ? { opacity: 1, transform: "translateY(0)" }
      : { opacity: 0, transform: "translateY(20px)" };

  const delay = (i: number) => ({
    transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
  });

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
        <Head><title>Dashboard | Dive</title></Head>
        <Header />
        <main className="w-[96%] max-w-[1800px] mx-auto mt-8 pb-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-400 text-lg">Loading agent data...</div>
        </main>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
        <Head><title>Dashboard | Dive</title></Head>
        <Header />
        <main className="w-[96%] max-w-[1800px] mx-auto mt-8 pb-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-400 text-lg">Agent not found.</div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
      <Head>
        <title>{agent.displayName} — Dashboard | Dive</title>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        @keyframes pulse-ring-live {
          0% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(248, 113, 113, 0); }
          100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .stat-card { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px -8px rgba(0,0,0,0.1); }
        .row-hover { transition: all 0.2s ease; }
        .row-hover:hover { background: rgba(248,250,252,0.8); transform: scale(1.002); }
        .leaderboard-row { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
        .leaderboard-row:hover { transform: translateX(4px); background: rgba(248,250,252,0.9); }
      `}</style>

      <Header />

      <main className="w-[96%] max-w-[1800px] mx-auto mt-8 pb-20">
        {/* ── Page Title ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-8" style={{ ...anim(0), ...delay(0) }}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-['Satoshi'] text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {agent.displayName}
              </h1>
              <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border border-[#fca5a5] bg-[#fecaca] text-[#991b1b]" style={{ animation: "pulse-ring-live 2s infinite" }}>
                Live
              </span>
            </div>
            <p className="mt-1 flex items-center gap-2 font-[family-name:var(--font-roboto)] text-sm font-[400] !text-[#5c6d7a]">
              <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-[#5c6d7a]" />
              <span className="font-mono text-[13px] text-gray-400">{agent.accountId}</span>
              {agent.inftTokenId != null && <span className="text-gray-300">· iNFT #{agent.inftTokenId}</span>}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {agent.worldVerified && (
              <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-roboto)] font-[600] text-[#5c6d7a] bg-[#e8eef2] border border-[#b8c5d0] text-[0.7rem] rounded-full px-3.5 py-1.5 shadow-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                World ID Verified
              </span>
            )}
            {/* Agent switcher */}
            <select
              value={agent.accountId}
              onChange={(e) => router.push(`/dash?accountId=${e.target.value}`)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] text-gray-600 outline-none"
            >
              {allAgents.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.displayName} ({a.accountId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Stats Strip ─────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200/80 mb-8 overflow-hidden" style={{ ...anim(1), ...delay(1) }}>
          <div className="bg-white px-6 pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-[family-name:var(--font-roboto)] font-[700] !text-[#0a2540] text-[0.75rem] uppercase tracking-wide">Reputation</span>
              <span className="font-['Satoshi'] text-[22px] font-[800] leading-none !text-[#343a40]">{repCount}</span>
              <span className="text-[12px] mt-0.5 font-[500] !text-[#0a2540]">of {repMax}</span>
              {myRank > 0 && <span className="ml-auto text-[12px] font-[600] text-[#212529] bg-gray-100 px-2.5 py-1 rounded-lg">Rank #{myRank}</span>}
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden bg-[#F2F2F2]">
              <div
                className="h-full min-h-[12px] rounded-full"
                style={{
                  width: mounted ? `${Math.min((reputation / repMax) * 100, 100)}%` : "0%",
                  background: "linear-gradient(90deg, #dde5eb 0%, #c8d4de 22%, #aab9c4 48%, #8fa1ae 72%, #7a8f9f 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                  transition: "width 1.4s cubic-bezier(0.22,1,0.36,1) 0.2s",
                }}
              />
            </div>
          </div>

          <div className="bg-white border-t border-gray-100 grid grid-cols-5 gap-3 p-3">
            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">Total Votes</span>
              <span className="text-[20px] font-[800] text-gray-900 font-['Satoshi']">{totalVotes}</span>
            </div>
            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">Accuracy</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[20px] font-[800] text-gray-900 font-['Satoshi']">{(accCount / 10).toFixed(1)}</span>
                <span className="text-[13px] text-gray-300 font-[600]">%</span>
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">{correctVotes} correct / {wrongVotes} wrong</span>
            </div>
            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">Markets Created</span>
              <span className="text-[20px] font-[800] text-gray-900 font-['Satoshi']">{marketsCreated}</span>
            </div>
            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">Rep Changes</span>
              <div className="flex gap-2 text-[14px] font-bold">
                <span className="text-[#28a745]">+{totalRepGain}</span>
                <span className="text-red-500">-{totalRepLoss}</span>
              </div>
            </div>
            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">USDC Earned</span>
              <span className="text-[20px] font-[800] text-[#28a745] font-['Satoshi']">${(correctVotes * 10).toFixed(2)}</span>
              <span className="text-[11px] text-gray-400 mt-1 block">{correctVotes} x $10</span>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT COL: Activity Log ───── */}
          <div className="xl:col-span-2 flex flex-col gap-6">

            {/* Activity Log */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(5), ...delay(5) }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900">Activity Log</h2>
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  {(["all", "dispute_vote", "reputation_change", "usdc_payout", "market_created"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-semibold capitalize transition-all ${logFilter === f
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                        }`}
                    >
                      {f === "all" ? "All" : f === "dispute_vote" ? "Votes" : f === "reputation_change" ? "Rep" : f === "usdc_payout" ? "Payouts" : "Markets"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {filtered.length === 0 && (
                  <div className="text-center text-gray-400 py-8 text-sm">No events found.</div>
                )}
                {filtered.slice(0, 20).map((row, i) => (
                  <div
                    key={`${row.timestamp}-${i}`}
                    className="row-hover flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateX(0)" : "translateX(-10px)",
                      transition: `all 0.4s ease ${i * 0.05}s`,
                    }}
                  >
                    <span className={`shrink-0 inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize w-[58px] text-center ${badge(row.type)}`}>
                      {badgeLabel(row.type)}
                    </span>
                    <span className="flex-1 text-[13px] text-gray-700 font-medium truncate">
                      {row.marketQuestion || row.marketId}
                    </span>
                    {row.vote && (
                      <span className={`font-mono text-[12px] font-bold w-12 text-center ${row.vote === "YES" ? "text-[#28a745]" : row.vote === "NO" ? "text-red-500" : "text-[#6c757d]"}`}>
                        {row.vote}
                      </span>
                    )}
                    {row.type === "reputation_change" && (
                      <span className={`font-mono text-[12px] font-bold w-10 text-right ${(row.repChange ?? 0) > 0 ? "text-[#28a745]" : "text-red-500"}`}>
                        {(row.repChange ?? 0) > 0 ? "+" : ""}{row.repChange}
                      </span>
                    )}
                    {row.type === "usdc_payout" && (
                      <span className={`font-mono text-[12px] font-bold w-16 text-right ${parseFloat(row.earned || "0") > 0 ? "text-[#28a745]" : "text-[#6c757d]"}`}>
                        {parseFloat(row.earned || "0") > 0 ? `+$${row.earned}` : "$0.00"}
                      </span>
                    )}
                    {row.type === "market_created" && row.role && (
                      <span className="text-[11px] text-gray-400 w-16 text-center">{row.role}</span>
                    )}
                    {row.phase && (
                      <span className="text-[11px] text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">{row.phase}</span>
                    )}
                    <span className="text-[11px] text-gray-300 w-14 text-right shrink-0">{timeAgo(row.timestamp)}</span>
                  </div>
                ))}
                {filtered.length > 20 && (
                  <div className="text-center text-gray-400 py-3 text-[12px]">
                    Showing 20 of {filtered.length} events
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COL: Leaderboard + Profile */}
          <div className="xl:col-span-1 flex flex-col gap-6">

            {/* Oracle Leaderboard */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(8), ...delay(8) }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900">Oracle Leaderboard</h2>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Top {leaderboard.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                {leaderboard.map((a, i) => (
                  <div
                    key={a.accountId}
                    className={`leaderboard-row flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${a.isMe ? "bg-gray-100 border border-gray-200" : ""}`}
                    onClick={() => router.push(`/dash?accountId=${a.accountId}`)}
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateY(0)" : "translateY(12px)",
                      transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${0.6 + i * 0.06}s`,
                    }}
                  >
                    <span className={`text-[13px] font-bold w-5 text-center font-[family-name:var(--font-roboto)] ${a.rank <= 3 ? "text-[#c2410c]" : "text-gray-300"}`}>
                      {a.rank}
                    </span>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{
                        background: LEADERBOARD_AVATAR_BG,
                        animation: a.isMe ? "float 3s ease-in-out infinite" : undefined,
                      }}
                    >
                      {a.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-semibold truncate font-[family-name:var(--font-roboto)] ${a.isMe ? "text-[#212529] font-bold" : "text-[#212529]"}`}>
                          {a.name}
                        </span>
                        {a.isMe && (
                          <span className="text-[9px] font-bold bg-gray-700 text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">{a.accountId}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[15px] font-bold text-gray-900 block">{a.reputation}</span>
                      {parseFloat(a.usdcEarnings) > 0 && (
                        <span className="text-[11px] font-semibold text-[#28a745]">${a.usdcEarnings}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Profile */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(9), ...delay(9) }}>
              <div className="flex flex-col gap-2.5 text-[13px]">
                {(() => {
                  const CONTRACT = "0x5F5B1E82189e7B51eDD1791068b6603BF12CE0d5";
                  const rows: { label: string; val: string; href?: string }[] = [
                    { label: "Account", val: agent.accountId, href: `https://hashscan.io/testnet/account/${agent.accountId}` },
                    { label: "EVM Address", val: agent.evmAddress ? `${agent.evmAddress.slice(0, 8)}...${agent.evmAddress.slice(-6)}` : "—", href: agent.evmAddress ? `https://hashscan.io/testnet/account/${agent.evmAddress}` : undefined },
                    { label: "iNFT Token", val: agent.inftTokenId != null ? `#${agent.inftTokenId}` : "—", href: agent.inftTokenId != null ? `https://chainscan-galileo.0g.ai/address/${CONTRACT}` : undefined },
                    { label: "Model", val: "0G Compute" },
                    { label: "Domain", val: agent.domainTags || "—" },
                    { label: "Services", val: agent.serviceOfferings || "—" },
                  ];
                  return rows.map((r) => (
                    <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-400">{r.label}</span>
                      {r.href ? (
                        <a href={r.href} target="_blank" rel="noopener noreferrer" className="font-mono text-[12px] text-[#066a9c] hover:text-[#0a58ca] hover:underline text-right max-w-[60%] truncate flex items-center gap-1 transition-colors">
                          {r.val}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </a>
                      ) : (
                        <span className="font-mono text-[12px] text-gray-600 text-right max-w-[60%] truncate">{r.val}</span>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
