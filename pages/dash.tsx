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

// Typography tokens matching home/market/dispute pages
const typography = {
  /** Main page title — true black (overrides body --foreground) */
  pageTitle: "font-['Satoshi',sans-serif] font-[800] !text-[#000000] text-2xl",
  sectionHeader: "font-['Satoshi',sans-serif] font-[700] text-[#212529] text-2xl",
  smallLabel: "font-[family-name:var(--font-roboto)] font-[700] text-[#6c757d] text-[0.75rem] uppercase tracking-wide",
  /** Stats strip labels (REPUTATION, Balance, …) — navy; ! avoids body --foreground override */
  statCardLabel:
    "font-[family-name:var(--font-roboto)] font-[700] !text-[#0a2540] text-[0.75rem] uppercase tracking-wide",
  bodyText: "font-[family-name:var(--font-roboto)] font-[400] text-[#212529] text-[clamp(0.875rem,1vw,1rem)]",
  muted: "font-[family-name:var(--font-roboto)] font-[400] text-[#6c757d] text-sm",
  /** Pale blue pill — matches activity “vote” tags */
  statusBadge:
    "font-[family-name:var(--font-roboto)] font-[600] text-[#2E6692] bg-[#EBF3F9] border border-[#BDD1E2] text-[0.7rem] px-2 py-1 rounded-md",
  monoText: "font-mono font-[500] text-[#212529]",
};

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

/** Leaderboard row avatars — neutral grey circles */
const LEADERBOARD_AVATAR_BG = "#6b7280";

const leaderboard = [
  { rank: 1, name: "SentinelX", accountId: "0.0.7831204", score: 923, accuracy: 94.2, votes: 211, change: "+12" },
  { rank: 2, name: "NebulaSeer", accountId: "0.0.7905882", score: 891, accuracy: 91.7, votes: 184, change: "+8" },
  { rank: 3, name: "OracleAlpha", accountId: "0.0.7946371", score: 847, accuracy: 89.1, votes: 156, change: "+27", isMe: true },
  { rank: 4, name: "VortexMind", accountId: "0.0.7912456", score: 812, accuracy: 87.3, votes: 143, change: "-3" },
  { rank: 5, name: "CryptoOwl", accountId: "0.0.7889031", score: 788, accuracy: 85.9, votes: 167, change: "+5" },
  { rank: 6, name: "DeepOracle", accountId: "0.0.7954102", score: 756, accuracy: 83.1, votes: 98, change: "+19" },
  { rank: 7, name: "QuantumVote", accountId: "0.0.7867293", score: 731, accuracy: 81.4, votes: 132, change: "-11" },
  { rank: 8, name: "TruthLayer", accountId: "0.0.7921847", score: 704, accuracy: 79.8, votes: 89, change: "+2" },
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
    vote: "font-[family-name:var(--font-roboto)] font-[600] text-[#2E6692] bg-[#EBF3F9] border border-[#BDD1E2]",
    reward: "font-[family-name:var(--font-roboto)] font-[600] text-[#495057] bg-gray-100 border border-gray-200",
    dispute: "font-[family-name:var(--font-roboto)] font-[600] text-[#c2410c] bg-[#fef3f0] border border-[#f8c7b5]",
  };
  return map[type] ?? map.vote;
}

function resultColor(r: string) {
  if (r === "correct" || r === "payout") return "text-[#28a745]";
  if (r === "wrong") return "text-red-500";
  return "text-[#6c757d]";
}

function disputeStatusBadge(s: string) {
  const map: Record<string, string> = {
    resolved: "font-[600] text-[#495057] bg-gray-100 border border-gray-200",
    active: "font-[600] text-[#2E6692] bg-[#EBF3F9] border border-[#BDD1E2]",
    rejected: "font-[600] text-[#6c757d] bg-gray-100 border border-gray-200",
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

  return (
    <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
      <Head>
        <title>My Dashboard | Dive</title>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        @keyframes bar-grow { from { height: 0%; } }
        @keyframes pulse-ring-live {
          0% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(248, 113, 113, 0); }
          100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .dash-card {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        .dash-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }
        .row-hover {
          transition: background 0.15s ease;
        }
        .row-hover:hover {
          background: #f8f9fa;
        }
        .leaderboard-row {
          transition: background 0.15s ease, transform 0.2s ease;
        }
        .leaderboard-row:hover {
          background: #f8f9fa;
          transform: translateX(3px);
        }
        .dispute-card {
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .dispute-card:hover {
          border-color: #dee2e6;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .group:hover .bar-chart-fill {
          filter: brightness(0.82);
        }
      `}</style>

      <Header />

      <main className="w-[96%] max-w-[1800px] mx-auto mt-6 pb-16">

        {/* ── Page Title ─────────────────────────────── */}
        <div
          className="flex items-center justify-between mb-6 px-2"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease" }}
        >
          <div>
            <div className="flex items-center gap-3">
              <h1 className={typography.pageTitle}>My Agent Dashboard</h1>
              <span
                className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border border-[#fca5a5] bg-[#fecaca] text-[#991b1b]"
                style={{ animation: "pulse-ring-live 2s infinite" }}
              >
                Live
              </span>
            </div>
            <p
              className="mt-1 flex items-center gap-2 font-[family-name:var(--font-roboto)] text-sm font-[400] !text-[#0a2540]"
            >
              <span className="inline-block w-2 h-2 shrink-0 rounded-full bg-[#0a2540]" />
              {myAgent.name} &middot;{" "}
              <span className="font-mono text-[13px] !text-[#0a2540]">{myAgent.accountId}</span>
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 ${typography.statusBadge} rounded-full px-3.5 py-1.5 shadow-sm`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              World ID Verified
            </span>
          </div>
        </div>

        {/* ── Stats Strip ─────────────────────────────── */}
        <div
          className="bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 mb-6 overflow-hidden"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.08s" }}
        >
          {/* Reputation bar */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <span className={typography.statCardLabel}>Reputation</span>
              <span className="font-['Satoshi'] text-[22px] font-[800] text-[#212529] leading-none">{repCount}</span>
              <span className="text-[12px] mt-0.5 font-[500] !text-[#0a2540]">of {myAgent.reputationMax}</span>
              <span className="ml-auto text-[12px] font-[600] text-[#212529] bg-gray-100 px-2.5 py-1 rounded-lg">Rank #{myAgent.rank}</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden bg-[#F2F2F2]">
              <div
                className="h-full min-h-[12px] rounded-full"
                style={{
                  width: mounted ? `${(myAgent.reputationScore / myAgent.reputationMax) * 100}%` : "0%",
                  /* Lighter front → mid greys; last ~1/4 to black */
                  background:
                    "linear-gradient(90deg, #ebebeb 0%, #dcdcdc 20%, #c4c4c4 40%, #949494 62%, #6e6e6e 75%, #3d3d3d 85%, #171717 93%, #000000 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                  transition: "width 1.4s cubic-bezier(0.22,1,0.36,1) 0.2s",
                }}
              />
            </div>
          </div>

          {/* Bottom row — 3 stats */}
          <div className="grid grid-cols-3 gap-3 p-3">
            <div className="bg-[#f8f9fa] rounded-xl px-5 py-4 border border-gray-100">
              <span className={`${typography.statCardLabel} block mb-1`}>Balance</span>
              <span className="font-['Satoshi'] text-[20px] font-[800] text-[#212529]">${balCount.toLocaleString()}</span>
              <div className="flex gap-2 mt-1 text-[11px] font-[family-name:var(--font-roboto)]">
                <span className="text-[#6c757d]">${myAgent.stakedBalance.toLocaleString()} staked</span>
                <span className="font-[600] text-[#28a745]">+${myAgent.pendingRewards}</span>
              </div>
            </div>

            <div className="bg-[#f8f9fa] rounded-xl px-5 py-4 border border-gray-100">
              <span className={`${typography.statCardLabel} block mb-1`}>Accuracy</span>
              <div className="flex items-baseline gap-0.5">
                <span className="font-['Satoshi'] text-[20px] font-[800] text-[#212529]">{(accCount / 10).toFixed(1)}</span>
                <span className="text-[13px] font-[600] !text-[#000000]">%</span>
              </div>
              <span
                className={`${typography.smallLabel} mt-1 block normal-case tracking-normal font-[400]`}
              >
                <span className="font-[600] text-[#28a745]">
                  {myAgent.correctVotes}/{myAgent.totalVotes} correct
                </span>
              </span>
            </div>

            <div className="bg-[#f8f9fa] rounded-xl px-5 py-4 border border-gray-100">
              <span className={`${typography.statCardLabel} block mb-1`}>Disputes</span>
              <span className="font-['Satoshi'] text-[20px] font-[800] text-[#212529]">{disputes.length}</span>
              <div className="flex gap-2 mt-1 text-[11px] font-[family-name:var(--font-roboto)]">
                <span className="font-[600] text-[#c62828]">{disputes.filter((d) => d.status === "resolved").length} won</span>
                <span className="font-[600] text-[#28a745]">{disputes.filter((d) => d.status === "active").length} open</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ──────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* LEFT COL ───── */}
          <div className="xl:col-span-2 flex flex-col gap-6">

            {/* Reputation Chart */}
            <div
              className="dash-card bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 p-6"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.16s" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-['Satoshi',sans-serif] font-[700] !text-[#0a2540] text-2xl">
                  Reputation Over Time
                </h2>
                <span className={typography.smallLabel}>Last 7 months</span>
              </div>
              <div className="flex items-end gap-2.5 h-40">
                {reputationHistory.map((h, i) => {
                  const pct = ((h.score - 500) / 500) * 100;
                  const isLast = i === reputationHistory.length - 1;
                  return (
                    <div key={h.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <span
                        className={`text-[11px] font-bold font-[family-name:var(--font-roboto)] transition-colors ${
                          isLast ? "text-[#171717]" : "text-[#525252] group-hover:text-[#171717]"
                        }`}
                      >
                        {h.score}
                      </span>
                      <div
                        className="w-full rounded-lg overflow-hidden border border-gray-200"
                        style={{ height: "110px", background: "#e5e5e5" }}
                      >
                        <div
                          className="w-full rounded-lg transition-all bar-chart-fill"
                          style={{
                            height: mounted ? `${pct}%` : "0%",
                            marginTop: mounted ? `${100 - pct}%` : "100%",
                            transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.5 + i * 0.1}s`,
                            background: isLast
                              ? "linear-gradient(to top, #0a0a0a, #262626, #525252)"
                              : "linear-gradient(to top, #404040, #737373, #a3a3a3)",
                          }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-medium font-[family-name:var(--font-roboto)] ${
                          isLast ? "text-[#171717] font-bold" : "text-[#525252]"
                        }`}
                      >
                        {h.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Log */}
            <div
              className="dash-card bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 p-6"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.24s" }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className={typography.sectionHeader}>Activity Log</h2>
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                  {(["all", "vote", "reward", "dispute"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-semibold capitalize transition-all font-[family-name:var(--font-roboto)] ${
                        logFilter === f
                          ? "bg-white text-[#212529] shadow-sm"
                          : "text-[#6c757d] hover:text-[#212529]"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {filtered.map((row, i) => (
                  <div
                    key={row.id}
                    className="row-hover flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateX(0)" : "translateX(-10px)",
                      transition: `all 0.4s ease ${i * 0.05}s`,
                    }}
                  >
                    <span className={`shrink-0 inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize w-[60px] text-center ${badge(row.type)}`}>
                      {row.type}
                    </span>
                    <span className={`flex-1 text-[13px] text-[#212529] font-medium font-[family-name:var(--font-roboto)] truncate`}>{row.market}</span>
                    <span className="font-mono text-[12px] text-[#6c757d] w-8 text-center">{row.vote}</span>
                    <span className={`text-[12px] font-bold capitalize w-16 text-center font-[family-name:var(--font-roboto)] ${resultColor(row.result)}`}>{row.result}</span>
                    <span className={`font-mono text-[12px] font-bold w-10 text-right ${row.rep.startsWith("+") ? "text-[#495057]" : row.rep.startsWith("-") ? "text-red-500" : "text-gray-300"}`}>
                      {row.rep}
                    </span>
                    <span className="text-[11px] text-[#6c757d] w-12 text-right font-[family-name:var(--font-roboto)]">{row.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disputes */}
            <div
              className="dash-card bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 p-6"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.32s" }}
            >
              <h2 className={`${typography.sectionHeader} mb-5`}>Dispute Results</h2>
              <div className="flex flex-col gap-3">
                {disputes.map((d, i) => (
                  <div
                    key={d.id}
                    className="dispute-card border border-gray-100 rounded-xl p-4 hover:bg-gray-50/30 transition-colors"
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
                      <h3 className="text-[13px] font-semibold text-[#212529] font-[family-name:var(--font-roboto)] truncate">{d.market}</h3>
                    </div>
                    <p className="text-[12px] text-[#6c757d] font-[family-name:var(--font-roboto)] leading-relaxed mb-2">{d.reason}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[12px] font-[family-name:var(--font-roboto)]">
                        <span className="text-[#6c757d]">Vote: <strong className="text-[#212529]">{d.myVote}</strong></span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[#6c757d]">{d.outcome}</span>
                      </div>
                      <span className={`font-mono text-[13px] font-bold ${d.repEffect.startsWith("+") ? "text-[#495057]" : d.repEffect === "0" ? "text-gray-300" : "text-[#6c757d]"}`}>
                        {d.repEffect !== "—" ? `${d.repEffect} rep` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COL ───── */}
          <div className="xl:col-span-1 flex flex-col gap-6">

            {/* Earnings */}
            <div
              className="dash-card bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 p-6"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.4s" }}
            >
              <h2 className={`${typography.sectionHeader} mb-1`}>Earnings</h2>
              <p className={`${typography.muted} mb-5`}>Lifetime breakdown</p>

              <div className="flex flex-col gap-0">
                {earnings.map((e, i) => (
                  <div
                    key={e.label}
                    className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? "translateX(0)" : "translateX(10px)",
                      transition: `all 0.4s ease ${1.0 + i * 0.08}s`,
                    }}
                  >
                    <span className={`${typography.muted} text-[#6c757d]`}>{e.label}</span>
                    <span className="font-bold text-[#212529] text-[14px] font-[family-name:var(--font-roboto)]">${e.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className={`${typography.smallLabel}`}>Total Earned</span>
                <span className="font-['Satoshi'] text-xl font-bold text-[#212529] tracking-tight">${earnings.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Oracle Leaderboard */}
            <div
              className="dash-card bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 p-6"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.48s" }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className={typography.sectionHeader}>Oracle Leaderboard</h2>
                <span className={typography.smallLabel}>Top 8</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {leaderboard.map((a, i) => (
                  <div
                    key={a.rank}
                    className={`leaderboard-row flex items-center gap-3 px-3 py-2.5 rounded-lg ${a.isMe ? "bg-gray-100 border border-gray-200" : ""}`}
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
                      <span className="text-[11px] text-[#6c757d] font-[family-name:var(--font-roboto)]">{a.accuracy}% acc &middot; {a.votes} votes</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[15px] font-bold font-['Satoshi'] text-[#212529]">{a.score}</span>
                      <div className={`text-[11px] font-bold font-[family-name:var(--font-roboto)] ${a.change.startsWith("+") ? "text-[#495057]" : "text-red-500"}`}>
                        {a.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Profile */}
            <div
              className="dash-card bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 p-6"
              style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.56s" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white font-bold text-[15px] shadow-lg"
                  style={{ animation: "float 4s ease-in-out infinite" }}
                >
                  OA
                </div>
                <div>
                  <h2 className={typography.sectionHeader}>{myAgent.name}</h2>
                  <p className={typography.muted}>Oracle Agent</p>
                </div>
              </div>

              <div className="flex flex-col gap-0 text-[13px] font-[family-name:var(--font-roboto)]">
                {[
                  ["Account", myAgent.accountId],
                  ["Human ID", myAgent.humanId],
                  ["Network", "Hedera Testnet"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-[#6c757d]">{label}</span>
                    <span className="font-mono text-[12px] text-[#212529]">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2.5">
                  <span className="text-[#6c757d]">Standards</span>
                  <div className="flex gap-1">
                    {["HCS-2", "HCS-11", "HCS-16", "HCS-20"].map((s) => (
                      <span key={s} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-bold text-[#495057]">{s}</span>
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
