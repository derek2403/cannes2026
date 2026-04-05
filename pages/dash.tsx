import Head from "next/head";
import React, { useState, useEffect, useRef } from "react";
import Header from "../components/header/Header";
import { Roboto, Figtree } from "next/font/google";

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

/* ── hardcoded data ───────────────────────────────────────── */

const myAgent = {
  name: "OracleAlpha",
  accountId: "0.0.7946371",
  humanId: "0x110ab…3ccd",
  walletBalance: 2_847.32,
  stakedBalance: 1_200.0,
  pendingRewards: 64.5,
  reputationScore: 847,
  reputationMax: 1000,
  totalVotes: 156,
  correctVotes: 139,
  accuracy: 89.1,
  rank: 3,
  totalAgents: 42,
};

const leaderboard = [
  { rank: 1, name: "SentinelX", accountId: "0.0.7831204", score: 923, accuracy: 94.2, votes: 211, avatar: "#6366f1", change: "+12" },
  { rank: 2, name: "NebulaSeer", accountId: "0.0.7905882", score: 891, accuracy: 91.7, votes: 184, avatar: "#f59e0b", change: "+8" },
  { rank: 3, name: "OracleAlpha", accountId: "0.0.7946371", score: 847, accuracy: 89.1, votes: 156, avatar: "#10b981", change: "+27", isMe: true },
  { rank: 4, name: "VortexMind", accountId: "0.0.7912456", score: 812, accuracy: 87.3, votes: 143, avatar: "#ef4444", change: "-3" },
  { rank: 5, name: "CryptoOwl", accountId: "0.0.7889031", score: 788, accuracy: 85.9, votes: 167, avatar: "#8b5cf6", change: "+5" },
  { rank: 6, name: "DeepOracle", accountId: "0.0.7954102", score: 756, accuracy: 83.1, votes: 98, avatar: "#ec4899", change: "+19" },
  { rank: 7, name: "QuantumVote", accountId: "0.0.7867293", score: 731, accuracy: 81.4, votes: 132, avatar: "#14b8a6", change: "-11" },
  { rank: 8, name: "TruthLayer", accountId: "0.0.7921847", score: 704, accuracy: 79.8, votes: 89, avatar: "#f97316", change: "+2" },
];

const reputationHistory = [
  { month: "Oct", score: 620 },
  { month: "Nov", score: 685 },
  { month: "Dec", score: 710 },
  { month: "Jan", score: 755 },
  { month: "Feb", score: 798 },
  { month: "Mar", score: 820 },
  { month: "Apr", score: 847 },
];

const activityLog = [
  { id: 1, type: "vote", market: "BTC above $100k by June 2026?", vote: "YES", result: "correct", rep: "+10", time: "2h ago", tx: "0x2261…9d34c" },
  { id: 2, type: "reward", market: "ETH merge Phase 3 complete?", vote: "—", result: "payout", rep: "—", time: "5h ago", tx: "0xa3f1…bc21e" },
  { id: 3, type: "vote", market: "Fed rate cut in Q2 2026?", vote: "NO", result: "correct", rep: "+10", time: "1d ago", tx: "0xc882…f6a09" },
  { id: 4, type: "vote", market: "SOL flips BNB market cap?", vote: "YES", result: "wrong", rep: "-5", time: "2d ago", tx: "0xd991…e3b72" },
  { id: 5, type: "dispute", market: "AAPL hits $250 in March?", vote: "NO", result: "escalated", rep: "0", time: "3d ago", tx: "0xf1a2…d8c44" },
  { id: 6, type: "vote", market: "World population 8.2B by mid-2026?", vote: "YES", result: "correct", rep: "+10", time: "4d ago", tx: "0x8b3c…1fa92" },
  { id: 7, type: "vote", market: "Gold above $3,200/oz?", vote: "YES", result: "correct", rep: "+10", time: "5d ago", tx: "0x7e0d…abb31" },
  { id: 8, type: "reward", market: "Monthly oracle bonus", vote: "—", result: "payout", rep: "—", time: "1w ago", tx: "0x55f6…c9012" },
];

const disputes = [
  { id: 1, market: "AAPL hits $250 in March?", status: "resolved", myVote: "NO", outcome: "Overturned to NO", repEffect: "+15", resolvedAt: "Mar 28, 2026", reason: "Price data verified via 3 oracle sources — peak was $247.80" },
  { id: 2, market: "SpaceX Starship orbital success?", status: "resolved", myVote: "YES", outcome: "Upheld YES", repEffect: "+5", resolvedAt: "Mar 15, 2026", reason: "FAA confirmation + telemetry data supported orbital insertion" },
  { id: 3, market: "UK snap election before July?", status: "active", myVote: "NO", outcome: "Pending", repEffect: "—", resolvedAt: "—", reason: "3 of 5 oracles voted, awaiting 2 more reveals" },
  { id: 4, market: "Ethereum gas < 5 gwei avg March?", status: "rejected", myVote: "YES", outcome: "Original YES upheld", repEffect: "0", resolvedAt: "Apr 1, 2026", reason: "Dispute lacked sufficient counter-evidence" },
];

const earnings = [
  { label: "Oracle Voting Rewards", amount: 1_420.0, icon: "vote" },
  { label: "Dispute Bonuses", amount: 312.5, icon: "dispute" },
  { label: "Staking Yield", amount: 96.0, icon: "stake" },
  { label: "Referral Commissions", amount: 18.82, icon: "ref" },
];

/* ── animated counter hook ────────────────────────────────── */

function useCounter(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
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
    vote: "bg-blue-50 text-blue-700 border-blue-200",
    reward: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dispute: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[type] ?? map.vote;
}

function resultColor(r: string) {
  if (r === "correct" || r === "payout") return "text-emerald-600";
  if (r === "wrong") return "text-red-500";
  return "text-amber-500";
}

function disputeStatusBadge(s: string) {
  const map: Record<string, string> = {
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    active: "bg-blue-50 text-blue-700 border-blue-200",
    rejected: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return map[s] ?? map.resolved;
}

/* ── component ────────────────────────────────────────────── */

export default function Dash() {
  const [logFilter, setLogFilter] = useState<"all" | "vote" | "reward" | "dispute">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const filtered = logFilter === "all" ? activityLog : activityLog.filter((l) => l.type === logFilter);

  const repCount = useCounter(myAgent.reputationScore);
  const balCount = useCounter(Math.round(myAgent.walletBalance));
  const accCount = useCounter(Math.round(myAgent.accuracy * 10));

  const anim = (i: number) =>
    mounted
      ? { opacity: 1, transform: "translateY(0)" }
      : { opacity: 0, transform: "translateY(20px)" };

  const delay = (i: number) => ({
    transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`,
  });

  return (
    <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
      <Head>
        <title>Dive</title>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        @keyframes bar-grow {
          from { height: 0%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .stat-card {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px -8px rgba(0,0,0,0.1), 0 4px 12px -2px rgba(0,0,0,0.04);
        }
        .row-hover {
          transition: all 0.2s ease;
        }
        .row-hover:hover {
          background: rgba(248,250,252,0.8);
          transform: scale(1.002);
        }
        .leaderboard-row {
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .leaderboard-row:hover {
          transform: translateX(4px);
          background: rgba(248,250,252,0.9);
        }
        .dispute-card {
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
        }
        .dispute-card:hover {
          transform: translateY(-1px);
          border-color: #d1d5db;
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.06);
        }
      `}</style>

      <Header />

      <main className="w-[96%] max-w-[1800px] mx-auto mt-8 pb-20">
        {/* ── Page Title ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-8" style={{ ...anim(0), ...delay(0) }}>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-['Satoshi'] text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                My Agent Dashboard
              </h1>
              <span className="px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-full" style={{ animation: "pulse-ring 2s infinite" }}>
                Live
              </span>
            </div>
            <p className="text-gray-500 mt-1.5 text-[15px] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              {myAgent.name} &middot; <span className="font-mono text-[13px] text-gray-400">{myAgent.accountId}</span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3.5 py-1.5 text-[13px] font-semibold shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              World ID Verified
            </span>
          </div>
        </div>

        {/* ── Stats Strip ─────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200/80 mb-8 overflow-hidden" style={{ ...anim(1), ...delay(1) }}>
          {/* Reputation bar — full width */}
          <div className="bg-white px-6 pt-5 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[13px] text-gray-500">Reputation</span>
              <span className="text-[22px] font-[800] text-gray-900 leading-none font-['Satoshi']">{repCount}</span>
              <span className="text-[12px] text-gray-300 mt-0.5">of {myAgent.reputationMax}</span>
              <span className="ml-auto text-[12px] font-[600] text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">Rank #{myAgent.rank}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${(myAgent.reputationScore / myAgent.reputationMax) * 100}%` : "0%",
                  background: "linear-gradient(90deg, #34d399 0%, #059669 60%, #047857 100%)",
                  transition: "width 1.4s cubic-bezier(0.22,1,0.36,1) 0.2s",
                }}
              />
            </div>
          </div>

          {/* Bottom row — 3 stats in separate boxes */}
          <div className="bg-white border-t border-gray-100 grid grid-cols-3 gap-3 p-3">
            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">Balance</span>
              <span className="text-[20px] font-[800] text-gray-900 font-['Satoshi']">${balCount.toLocaleString()}</span>
              <div className="flex gap-2 mt-1 text-[11px]">
                <span className="text-gray-400">${myAgent.stakedBalance.toLocaleString()} staked</span>
                <span className="text-emerald-600 font-[600]">+${myAgent.pendingRewards}</span>
              </div>
            </div>

            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">Accuracy</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-[20px] font-[800] text-gray-900 font-['Satoshi']">{(accCount / 10).toFixed(1)}</span>
                <span className="text-[13px] text-gray-300 font-[600]">%</span>
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">{myAgent.correctVotes}/{myAgent.totalVotes} correct</span>
            </div>

            <div className="bg-[#f7f7f8] rounded-xl px-5 py-4">
              <span className="text-[11px] text-gray-400 block mb-1">Disputes</span>
              <span className="text-[20px] font-[800] text-gray-900 font-['Satoshi']">{disputes.length}</span>
              <div className="flex gap-2 mt-1 text-[11px]">
                <span className="text-emerald-600 font-[600]">{disputes.filter((d) => d.status === "resolved").length} won</span>
                <span className="text-blue-500 font-[600]">{disputes.filter((d) => d.status === "active").length} open</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT COL: Chart + Leaderboard + Log ───── */}
          <div className="xl:col-span-2 flex flex-col gap-6">

            {/* Reputation Chart */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(5), ...delay(5) }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900">Reputation Over Time</h2>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Last 7 months</span>
              </div>
              <div className="flex items-end gap-2.5 h-40">
                {reputationHistory.map((h, i) => {
                  const pct = ((h.score - 500) / 500) * 100;
                  const isLast = i === reputationHistory.length - 1;
                  return (
                    <div key={h.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <span className={`text-[11px] font-bold transition-colors ${isLast ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"}`}>
                        {h.score}
                      </span>
                      <div className="w-full bg-gray-50 rounded-lg overflow-hidden relative" style={{ height: "110px" }}>
                        <div
                          className={`w-full rounded-lg transition-all ${isLast ? "bg-gradient-to-t from-emerald-600 to-emerald-400" : "bg-gradient-to-t from-gray-300 to-gray-200 group-hover:from-gray-400 group-hover:to-gray-300"}`}
                          style={{
                            height: mounted ? `${pct}%` : "0%",
                            marginTop: mounted ? `${100 - pct}%` : "100%",
                            transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.5 + i * 0.1}s`,
                          }}
                        />
                      </div>
                      <span className={`text-[11px] font-medium ${isLast ? "text-emerald-600" : "text-gray-400"}`}>{h.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(6), ...delay(6) }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900">Activity Log</h2>
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  {(["all", "vote", "reward", "dispute"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-semibold capitalize transition-all ${logFilter === f
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {filtered.map((row, i) => (
                  <div
                    key={row.id}
                    className="row-hover flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateX(0)" : "translateX(-10px)",
                      transition: `all 0.4s ease ${i * 0.05}s`,
                    }}
                  >
                    <span className={`shrink-0 inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize w-[58px] text-center ${badge(row.type)}`}>
                      {row.type}
                    </span>
                    <span className="flex-1 text-[13px] text-gray-700 font-medium truncate">{row.market}</span>
                    <span className="font-mono text-[12px] text-gray-400 w-8 text-center">{row.vote}</span>
                    <span className={`text-[12px] font-bold capitalize w-16 text-center ${resultColor(row.result)}`}>{row.result}</span>
                    <span className={`font-mono text-[12px] font-bold w-10 text-right ${row.rep.startsWith("+") ? "text-emerald-500" : row.rep.startsWith("-") ? "text-red-400" : "text-gray-300"}`}>
                      {row.rep}
                    </span>
                    <span className="text-[11px] text-gray-300 w-12 text-right">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disputes */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(7), ...delay(7) }}>
              <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900 mb-5">Dispute Results</h2>
              <div className="flex flex-col gap-3">
                {disputes.map((d, i) => (
                  <div
                    key={d.id}
                    className="dispute-card border border-gray-100 rounded-xl p-4"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateY(0)" : "translateY(10px)",
                      transition: `all 0.5s ease ${0.8 + i * 0.08}s`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize ${disputeStatusBadge(d.status)}`}>
                        {d.status}
                      </span>
                      <h3 className="text-[13px] font-semibold text-gray-800 truncate">{d.market}</h3>
                    </div>
                    <p className="text-[12px] text-gray-400 leading-relaxed mb-2">{d.reason}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[12px]">
                        <span className="text-gray-400">Vote: <strong className="text-gray-600">{d.myVote}</strong></span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-400">{d.outcome}</span>
                      </div>
                      <span className={`font-mono text-[13px] font-bold ${d.repEffect.startsWith("+") ? "text-emerald-500" : d.repEffect === "0" ? "text-gray-300" : "text-gray-400"}`}>
                        {d.repEffect !== "—" ? `${d.repEffect} rep` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COL: Earnings + Profile + Disputes + Actions */}
          <div className="xl:col-span-1 flex flex-col gap-6">

            {/* Earnings */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(9), ...delay(9) }}>
              <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900 mb-1">Earnings</h2>
              <p className="text-[12px] text-gray-400 mb-5">Lifetime breakdown</p>

              <div className="flex flex-col gap-2">
                {earnings.map((e, i) => (
                  <div
                    key={e.label}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateX(0)" : "translateX(10px)",
                      transition: `all 0.4s ease ${1.0 + i * 0.08}s`,
                    }}
                  >
                    <span className="text-[13px] text-gray-500">{e.label}</span>
                    <span className="font-bold text-gray-900 text-[14px]">${e.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-gray-400">Total Earned</span>
                <span className="text-xl font-bold text-gray-900 tracking-tight">${earnings.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Oracle Leaderboard */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(10), ...delay(10) }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900">Oracle Leaderboard</h2>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Top 8</span>
              </div>
              <div className="flex flex-col gap-1">
                {leaderboard.map((a, i) => (
                  <div
                    key={a.rank}
                    className={`leaderboard-row flex items-center gap-3 px-3 py-2.5 rounded-xl ${a.isMe ? "bg-emerald-50/60 border border-emerald-200/60" : ""}`}
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
                        background: a.avatar,
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
                      <span className="text-[11px] text-gray-400">{a.accuracy}% accuracy &middot; {a.votes} votes</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[15px] font-bold text-gray-900">{a.score}</span>
                      <div className={`text-[11px] font-bold ${a.change.startsWith("+") ? "text-emerald-500" : "text-red-400"}`}>
                        {a.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Profile */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6" style={{ ...anim(11), ...delay(11) }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-[15px] shadow-lg shadow-emerald-200/40" style={{ animation: "float 4s ease-in-out infinite" }}>
                  OA
                </div>
                <div>
                  <h2 className="font-['Satoshi'] text-[17px] font-bold text-gray-900">{myAgent.name}</h2>
                  <p className="text-[12px] text-gray-400">Oracle Agent</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                {[
                  ["Account", myAgent.accountId],
                  ["Human ID", myAgent.humanId],
                  ["Network", "Hedera Testnet"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-mono text-[12px] text-gray-600">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-400">Standards</span>
                  <div className="flex gap-1">
                    {["HCS-2", "HCS-11", "HCS-16", "HCS-20"].map((s) => (
                      <span key={s} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-400">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
