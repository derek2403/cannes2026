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
}

interface HistoryEvent {
  type: "market_created" | "dispute_vote" | "reputation_change";
  timestamp: string;
  agentName: string;
  marketId: string;
  marketQuestion?: string;
  vote?: string;
  outcome?: string;
  correct?: boolean;
  repChange?: number;
  phase?: string;
  role?: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  accountId: string;
  reputation: number;
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
    market_created: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dispute_vote: "bg-blue-50 text-blue-700 border-blue-200",
    reputation_change: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[type] ?? map.dispute_vote;
}

function badgeLabel(type: string) {
  const map: Record<string, string> = {
    market_created: "create",
    dispute_vote: "vote",
    reputation_change: "rep",
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

const AVATAR_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];

/* ── component ────────────────────────────────────────────── */

export default function Dash() {
  const router = useRouter();
  const { accountId: qAccountId, name: qName } = router.query;

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [allAgents, setAllAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState<"all" | "market_created" | "dispute_vote" | "reputation_change">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const stateRes = await fetch("/api/agents/state");
      const state = await stateRes.json();
      const agents: AgentData[] = state.agents || [];
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

      if (found) {
        const histRes = await fetch(`/api/agents/history?agent=${encodeURIComponent(found.displayName)}`);
        const hist = await histRes.json();
        setEvents((hist.events || []).reverse());
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
  const leaderboard: LeaderboardEntry[] = allAgents
    .map((a) => ({ name: a.displayName, accountId: a.accountId, reputation: a.reputation ?? 10, isMe: a.accountId === agent?.accountId }))
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
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
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
              <span className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-full" style={{ animation: "pulse-ring 2s infinite" }}>
                Live
              </span>
            </div>
            <p className="text-gray-500 mt-1.5 text-[15px] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-[13px] text-gray-400">{agent.accountId}</span>
              {agent.inftTokenId != null && <span className="text-gray-300">· iNFT #{agent.inftTokenId}</span>}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {agent.worldVerified && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3.5 py-1.5 text-[13px] font-semibold shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
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
              <span className="text-[13px] text-gray-500">Reputation</span>
              <span className="text-[22px] font-[800] text-gray-900 leading-none font-['Satoshi']">{repCount}</span>
              <span className="text-[12px] text-gray-300 mt-0.5">of {repMax}</span>
              {myRank > 0 && <span className="ml-auto text-[12px] font-[600] text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">Rank #{myRank}</span>}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${Math.min((reputation / repMax) * 100, 100)}%` : "0%",
                  background: "linear-gradient(90deg, #34d399 0%, #059669 60%, #047857 100%)",
                  transition: "width 1.4s cubic-bezier(0.22,1,0.36,1) 0.2s",
                }}
              />
            </div>
          </div>

          <div className="bg-white border-t border-gray-100 grid grid-cols-4 gap-3 p-3">
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
                <span className="text-emerald-600">+{totalRepGain}</span>
                <span className="text-red-400">-{totalRepLoss}</span>
              </div>
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
                  {(["all", "dispute_vote", "reputation_change", "market_created"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-semibold capitalize transition-all ${logFilter === f
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                        }`}
                    >
                      {f === "all" ? "All" : f === "dispute_vote" ? "Votes" : f === "reputation_change" ? "Rep" : "Markets"}
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
                      <span className={`font-mono text-[12px] font-bold w-12 text-center ${row.vote === "YES" ? "text-emerald-600" : row.vote === "NO" ? "text-red-500" : "text-gray-400"}`}>
                        {row.vote}
                      </span>
                    )}
                    {row.type === "reputation_change" && (
                      <span className={`font-mono text-[12px] font-bold w-10 text-right ${(row.repChange ?? 0) > 0 ? "text-emerald-500" : "text-red-400"}`}>
                        {(row.repChange ?? 0) > 0 ? "+" : ""}{row.repChange}
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
                    className={`leaderboard-row flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${a.isMe ? "bg-emerald-50/60 border border-emerald-200/60" : ""}`}
                    onClick={() => router.push(`/dash?accountId=${a.accountId}`)}
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateY(0)" : "translateY(12px)",
                      transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${0.6 + i * 0.06}s`,
                    }}
                  >
                    <span className={`text-[13px] font-bold w-5 text-center ${a.rank <= 3 ? "text-amber-500" : "text-gray-300"}`}>
                      {a.rank}
                    </span>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{
                        background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                        animation: a.isMe ? "float 3s ease-in-out infinite" : undefined,
                      }}
                    >
                      {a.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[13px] font-semibold truncate ${a.isMe ? "text-emerald-700" : "text-gray-800"}`}>
                          {a.name}
                        </span>
                        {a.isMe && (
                          <span className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full uppercase">You</span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">{a.accountId}</span>
                    </div>
                    <span className="text-[15px] font-bold text-gray-900">{a.reputation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Profile */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(9), ...delay(9) }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-[15px] shadow-lg shadow-emerald-200/40" style={{ animation: "float 4s ease-in-out infinite" }}>
                  {agent.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900">{agent.displayName}</h2>
                  <p className="text-[12px] text-gray-400">Oracle Agent</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                {[
                  ["Account", agent.accountId],
                  ["EVM Address", agent.evmAddress ? `${agent.evmAddress.slice(0, 8)}...${agent.evmAddress.slice(-6)}` : "—"],
                  ["iNFT Token", agent.inftTokenId != null ? `#${agent.inftTokenId}` : "—"],
                  ["Model", agent.modelProvider || "—"],
                  ["Domain", agent.domainTags || "—"],
                  ["Services", agent.serviceOfferings || "—"],
                  ["Human ID", agent.humanId ? `${String(agent.humanId).slice(0, 10)}...` : "Not verified"],
                  ["Network", "Hedera Testnet"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-mono text-[12px] text-gray-600 text-right max-w-[60%] truncate">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
