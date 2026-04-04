import Head from 'next/head';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/header/Header';
import { Roboto, Figtree } from "next/font/google";
import cloud from 'd3-cloud';

const roboto = Roboto({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-roboto' });
const figtree = Figtree({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-figtree' });

interface WordNode { text: string; size: number; x?: number; y?: number; rotate?: number; font?: string; color?: string; weight?: string | number; forceRotate?: number; }

const cloudWordsData = [
    { text: "Analysis", size: 144, color: "#111623", weight: 900, forceRotate: 0 },
    { text: "Forecast", size: 108, color: "#066a9c", weight: 900 },
    { text: "Probability", size: 86, color: "#212529", weight: 900 },
    { text: "Consensus", size: 74, color: "#c2410c", weight: 900, forceRotate: 0 },
    { text: "Trend", size: 70, color: "#28a745", weight: 900 },
    { text: "Market", size: 62, color: "#066a9c", weight: 900 },
    { text: "Prediction", size: 55, color: "#111623", weight: 900 },
    { text: "Odds", size: 53, color: "#c2410c", weight: 900 },
    { text: "Sentiment", size: 48, color: "#066a9c", weight: 900 },
    { text: "yes", size: 43, color: "#28a745", weight: 900 },
    { text: "volatility", size: 38, color: "#212529", weight: 900 },
    { text: "Volume", size: 41, color: "#b91c1c", weight: 900 },
    { text: "Dispute", size: 36, color: "#b91c1c", weight: 900 },
    { text: "Oracle", size: 31, color: "#066a9c", weight: 900 },
    { text: "Resolution", size: 31, color: "#6c757d", weight: 800 },
    { text: "Truth", size: 29, color: "#111623", weight: 900 },
    { text: "Wisdom", size: 29, color: "#212529", weight: 800 },
];

function InteractiveWordCloud() {
    const [words, setWords] = useState<WordNode[]>([]);
    const width = 1300; const height = 580;
    useEffect(() => {
        let seed = 42;
        const seededRand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0x100000000; };
        const origRandom = Math.random;
        Math.random = seededRand;
        cloud<WordNode>().size([width, height]).words(cloudWordsData.map(d => ({ ...d }))).padding(6)
            .rotate((d: WordNode) => d.forceRotate !== undefined ? d.forceRotate : (seededRand() > 0.5 ? 0 : -90))
            .font("Satoshi").fontSize(d => d.size)
            .on("end", (computedWords) => { Math.random = origRandom; setWords(computedWords as WordNode[]); }).start();
        return () => { Math.random = origRandom; };
    }, []);
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full min-h-[160px] overflow-visible">
            <g transform={`translate(${width / 2},${height / 2})`}>
                {words.filter(w => w.x !== undefined && w.y !== undefined).map((w, i) => (
                    <text key={i} textAnchor="middle" transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
                        style={{ fontSize: `${w.size}px`, fontFamily: `${w.font}, Impact, system-ui, sans-serif`, fill: w.color, fontWeight: 900, letterSpacing: "-0.02em", transition: "all 0.3s ease" }}
                        className="hover:opacity-70 cursor-pointer drop-shadow-sm">{w.text}</text>
                ))}
            </g>
        </svg>
    );
}

// Semi-circle gauge that actually draws correctly
function SemiGauge({ yesPercent }: { yesPercent: number }) {
    const noPercent = 100 - yesPercent;
    // Angle: 0% = -90deg (left), 100% = 90deg (right)
    const needleAngle = -90 + (yesPercent / 100) * 180;
    return (
        <div className="flex flex-col items-center">
            <svg width="160" height="90" viewBox="0 0 160 90">
                {/* Background arc */}
                <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="#f3f4f6" strokeWidth="14" strokeLinecap="round" />
                {/* No (red) arc — left side */}
                <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="#f87171" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={`${(noPercent / 100) * 220} 220`} />
                {/* Yes (green) arc — right side */}
                <path d="M 150 80 A 70 70 0 0 0 10 80" fill="none" stroke="#34d399" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={`${(yesPercent / 100) * 220} 220`} />
                {/* Needle */}
                <line x1="80" y1="80" x2={80 + 50 * Math.cos((needleAngle * Math.PI) / 180)} y2={80 + 50 * Math.sin((needleAngle * Math.PI) / 180)}
                    stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
                <circle cx="80" cy="80" r="5" fill="#1f2937" />
            </svg>
            <div className="flex w-full px-2 justify-between font-bold mt-1">
                <span className="text-red-600 font-mono text-sm">{noPercent} No</span>
                <span className="text-emerald-500 font-mono text-sm">{yesPercent} Yes</span>
            </div>
        </div>
    );
}

const ALL_AGENTS = [
    "ResearchBot", "CritiqueBot", "MarketBot", "DataBot", "SentinelBot",
    "OracleAlpha", "TruthSeeker", "RiskAnalyst", "DeepDive", "ConsensusAI",
    "FactChecker", "TrendWatcher", "PolicyBot", "ArbitrageAI", "SignalBot",
];

function selectRandomAgents(count: number): string[] {
    const shuffled = [...ALL_AGENTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

const STEPS = [
    { label: "Outcome proposed: No", sub: null, type: "dot" },
    { label: "Dispute window", sub: "Bond: 750 USDC", type: "gavel" },
    { label: "Round 1: Commit-Reveal", sub: null, type: "dot" },
    { label: "Discussion", sub: null, type: "chat" },
    { label: "Round 2: Commit-Reveal", sub: null, type: "dot" },
    { label: "Final outcome", sub: null, type: "dot" },
];

const OUTCOME_INDEX_PERCENT = { yes: 1, no: 99 } as const;

export default function DisputePage() {
    // disputeStep: 0=initial, 2=r1 commit, 3=r1 reveal, 4=discussion, 5=r2 commit, 6=r2 reveal, 7=final
    const [disputeStep, setDisputeStep] = useState(0);
    const [currentRound, setCurrentRound] = useState(0);
    const [commitTimeLeft, setCommitTimeLeft] = useState(10);
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [visibleAgentCount, setVisibleAgentCount] = useState(0);
    const [agentVotes, setAgentVotes] = useState<Record<string, "YES" | "NO" | null>>({});
    const [allVotesRevealed, setAllVotesRevealed] = useState(false);
    const [showDiscussion, setShowDiscussion] = useState(false);
    const [discussionMessages, setDiscussionMessages] = useState<{ agent: string; text: string }[]>([]);
    const [round1Result, setRound1Result] = useState<{ yes: number; no: number } | null>(null);

    // Commit timer
    useEffect(() => {
        if ((disputeStep === 2 || disputeStep === 5) && commitTimeLeft > 0) {
            const t = setInterval(() => setCommitTimeLeft(p => p - 1), 1000);
            return () => clearInterval(t);
        }
    }, [disputeStep, commitTimeLeft]);

    // Auto-transition: all votes shown in commit → start reveal in right panel
    useEffect(() => {
        if ((disputeStep === 2 || disputeStep === 5) && commitTimeLeft === 0 && visibleAgentCount >= selectedAgents.length) {
            const t = setTimeout(() => {
                setDisputeStep(prev => prev + 1); // 2→3 or 5→6
                setAllVotesRevealed(false);
                startReveal();
            }, 800);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disputeStep, commitTimeLeft, visibleAgentCount, selectedAgents.length]);

    const startDispute = useCallback(() => {
        const agents = selectRandomAgents(10);
        setSelectedAgents(agents);
        setVisibleAgentCount(0);
        setAgentVotes({});
        setAllVotesRevealed(false);
        setRound1Result(null);
        setCurrentRound(1);
        setDisputeStep(2);
        setCommitTimeLeft(10);

        let count = 0;
        const interval = setInterval(() => {
            count++;
            setVisibleAgentCount(count);
            if (count >= agents.length) clearInterval(interval);
        }, 400);
    }, []);

    const startRound2 = useCallback(() => {
        setCurrentRound(2);
        setAgentVotes({});
        setAllVotesRevealed(false);
        setCommitTimeLeft(10);
        setDisputeStep(5);
        // Show all agents immediately (same committee)
        setVisibleAgentCount(selectedAgents.length);
    }, [selectedAgents]);

    const startReveal = useCallback(() => {
        const isRound2 = disputeStep === 5;
        const votes: Record<string, "YES" | "NO"> = {};
        selectedAgents.forEach((agent, i) => {
            if (isRound2) {
                votes[agent] = i < 8 ? "YES" : "NO";
            } else {
                votes[agent] = i < 4 ? "YES" : "NO";
            }
        });

        let count = 0;
        const interval = setInterval(() => {
            const agent = selectedAgents[count];
            if (agent) {
                setAgentVotes(prev => ({ ...prev, [agent]: votes[agent] }));
            }
            count++;
            if (count >= selectedAgents.length) {
                clearInterval(interval);
                setAllVotesRevealed(true);

                const yes = Object.values(votes).filter(v => v === "YES").length;
                const no = Object.values(votes).filter(v => v === "NO").length;

                if (!isRound2) {
                    setRound1Result({ yes, no });
                    setTimeout(() => {
                        setDisputeStep(4);
                        generateDiscussion(votes);
                    }, 2000);
                } else {
                    setTimeout(() => setDisputeStep(7), 2000);
                }
            }
        }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAgents, disputeStep]);

    const generateDiscussion = (votes: Record<string, "YES" | "NO">) => {
        const yesAgents = Object.entries(votes).filter(([, v]) => v === "YES").map(([a]) => a);
        const noAgents = Object.entries(votes).filter(([, v]) => v === "NO").map(([a]) => a);
        setDiscussionMessages([
            { agent: noAgents[0], text: "Based on current crude oil futures and OPEC+ production data, the probability of WTI reaching this target is below 15%. Supply constraints are insufficient." },
            { agent: yesAgents[0], text: `I disagree with ${noAgents[0]}. Geopolitical instability indices are lagging — the baseline disruption risk from recent sanctions hasn't been priced in yet.` },
            { agent: noAgents[1], text: `${yesAgents[0]} raises a valid point about sanctions, but the demand-side data from IEA reports shows consumption declining. The fundamentals don't support YES.` },
            { agent: yesAgents[1], text: "Looking at Reuters and Bloomberg data, there's a credible scenario with Middle East supply disruptions. The market is underpricing tail risk." },
            { agent: noAgents[2], text: "After reviewing all arguments, I acknowledge the geopolitical risk factor. The weight of evidence is closer than I initially thought." },
        ]);
    };

    const handleFastForward = (e: React.MouseEvent) => { e.stopPropagation(); setCommitTimeLeft(0); };

    const isCommitPhase = disputeStep === 2 || disputeStep === 5;
    const isRevealPhase = disputeStep === 3 || disputeStep === 6;
    const isMiddleUnlocked = disputeStep >= 2 && disputeStep !== 4;
    const isRightUnlocked = isRevealPhase || disputeStep === 7;
    const isDiscussionPhase = disputeStep === 4;

    const trackerStep = disputeStep === 0 ? 0 : disputeStep <= 3 ? 2 : disputeStep === 4 ? 3 : disputeStep <= 6 ? 4 : 5;

    // Determine revealed vote counts for right panel
    const revealedYes = Object.values(agentVotes).filter(v => v === "YES").length;
    const revealedNo = Object.values(agentVotes).filter(v => v === "NO").length;
    const yesPercent = revealedYes + revealedNo > 0 ? Math.round((revealedYes / (revealedYes + revealedNo)) * 100) : 50;

    return (
        <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
            <Head>
                <title>Dispute | Prediction Market</title>
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
            </Head>
            <Header />

            <main className="w-[96%] max-w-[1800px] mx-auto mt-12 pb-16">
                {/* Page header */}
                <div className="flex items-start gap-4 mb-10 border-b border-gray-200 pb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center shrink-0 shadow-sm border border-gray-700">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 22C7.58172 22 4 18.4183 4 14C4 9.58172 12 2 12 2C12 2 20 9.58172 20 14C20 18.4183 16.4183 22 12 22Z" /></svg>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-1 tracking-wide">
                            <span className="uppercase">Finance</span><span>&middot;</span><span className="uppercase">Monthly</span>
                        </div>
                        <h1 className="font-['Satoshi'] text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                            What will WTI Crude Oil (WTI) hit in April 2026?
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ═══ LEFT: Outcome + Tracker ═══ */}
                    <div className="flex flex-col gap-6">
                        {/* Outcome hero */}
                        <div className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-gray-200 shadow-sm h-[200px]">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg transition-all duration-1000 ${disputeStep >= 7 ? 'bg-emerald-500 shadow-emerald-200' : 'bg-[#EF5A5A] shadow-red-200'}`}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <h2 className={`font-['Satoshi'] font-bold text-2xl mb-1 tracking-wide transition-colors duration-1000 ${disputeStep >= 7 ? 'text-emerald-500' : 'text-[#EF5A5A]'}`}>
                                Outcome: {disputeStep >= 7 ? 'Yes' : 'No'}
                            </h2>
                            <p className="text-gray-500 font-medium text-sm">March 15</p>
                        </div>

                        {/* Outcome bar */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="font-['Satoshi'] font-bold text-gray-900 text-sm">Outcome</span>
                                <span className="text-xs font-semibold">
                                    <span className="text-emerald-500">{disputeStep >= 7 ? '80' : OUTCOME_INDEX_PERCENT.yes}% yes</span>
                                    <span className="text-gray-400"> · </span>
                                    <span className="text-red-500">{disputeStep >= 7 ? '20' : OUTCOME_INDEX_PERCENT.no}% no</span>
                                </span>
                            </div>
                            <div className="relative h-8 w-full rounded-full border border-gray-200 overflow-hidden bg-gray-50">
                                <div className="absolute inset-y-0 left-0 bg-emerald-400 transition-all duration-1000" style={{ width: `${disputeStep >= 7 ? 80 : OUTCOME_INDEX_PERCENT.yes}%` }} />
                                <div className="absolute inset-y-0 bg-red-400/92 transition-all duration-1000" style={{ left: `${disputeStep >= 7 ? 80 : OUTCOME_INDEX_PERCENT.yes}%`, right: 0 }} />
                            </div>
                        </div>

                        {/* Dispute Tracker */}
                        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Resolution</p>
                            <p className="mb-5 text-sm font-bold text-gray-700">Dispute Tracker</p>

                            <div className="flex flex-col gap-2.5">
                                {STEPS.map((s, i, arr) => {
                                    const isDone = i < trackerStep;
                                    const isActive = i === trackerStep;
                                    const isIcon = s.type === "gavel" || s.type === "chat";
                                    return (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 text-[10px] ${
                                                    isIcon
                                                        ? isActive ? "bg-gray-200 text-gray-600 ring-2 ring-blue-500" : isDone ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-400"
                                                        : isDone ? "bg-blue-500 text-white" : isActive ? "border-2 border-blue-500 bg-white" : "border-2 border-gray-200 bg-white"
                                                }`}>
                                                    {s.type === "chat" ? '💬' : s.type === "gavel" ? '⚖' : isDone ? '✓' : null}
                                                </div>
                                                {i < arr.length - 1 && <div className={`w-[2px] h-3 transition-colors duration-500 ${isDone ? "bg-blue-500" : "bg-gray-200"}`} />}
                                            </div>
                                            <div className="pt-0.5">
                                                <div className={`text-xs font-semibold transition-colors ${isDone ? "text-gray-900" : isActive ? "text-blue-500" : "text-gray-400"}`}>
                                                    {s.label}
                                                    {i === 2 && round1Result && ` — ${round1Result.yes}Y / ${round1Result.no}N (no consensus)`}
                                                    {i === 4 && disputeStep >= 7 && ' — 8Y / 2N (resolved)'}
                                                </div>
                                                {s.sub && isDone && <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {disputeStep === 0 && (
                                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>Bond:</span><span className="font-bold text-gray-900">750 USDC</span>
                                    </div>
                                    <button onClick={startDispute} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition-colors">
                                        Dispute &amp; Submit Bond
                                    </button>
                                </div>
                            )}

                            {disputeStep === 4 && (
                                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">No consensus. Proceed to Round 2.</span>
                                    <button onClick={startRound2} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition-colors">
                                        Start Round 2
                                    </button>
                                </div>
                            )}

                            {disputeStep >= 7 && (
                                <div className="mt-5 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                        <span className="text-xs font-bold text-gray-900">Market resolved: <span className="text-blue-500">Yes</span> (80%)</span>
                                    </div>
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="text-xs font-bold text-green-700 mb-0.5">Dispute successful</div>
                                        <p className="text-xs text-green-600">Outcome changed No → Yes. Bond of <span className="font-bold">750 USDC</span> returned.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ MIDDLE: Commit Phase ═══ */}
                    <div className={`rounded-3xl border-2 flex flex-col p-8 transition-all duration-700 h-full relative overflow-hidden ${isMiddleUnlocked ? 'bg-white border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.06)]' : 'bg-gray-100 border-gray-200 shadow-inner'}`}>
                        {isMiddleUnlocked && <div className="absolute inset-0 bg-gradient-to-tr from-gray-50/60 to-transparent pointer-events-none" />}

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className={`font-['Satoshi'] font-bold text-2xl transition-colors ${isMiddleUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                                {currentRound === 2 ? 'Round 2 Commit' : 'Commit Phase'}
                            </h3>
                            {isCommitPhase && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2.5 bg-white border-2 border-gray-200 px-4 py-2 rounded-full shadow-sm">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={commitTimeLeft > 0 ? "text-gray-500" : "text-green-500"}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                        {commitTimeLeft > 0
                                            ? <span className="text-gray-900 font-mono font-bold">{commitTimeLeft}s</span>
                                            : <span className="text-green-600 font-bold font-mono uppercase">Complete</span>}
                                    </div>
                                    {commitTimeLeft > 0 && (
                                        <button onClick={handleFastForward} className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-700 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all shadow-sm bg-white">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {isMiddleUnlocked ? (
                            <div className="relative z-10 flex flex-col flex-1">
                                <h4 className="font-['Satoshi'] text-xl font-bold text-gray-900 mb-6">
                                    {currentRound === 1 ? (
                                        <>Agent selection: <span className="underline decoration-2 underline-offset-4">{visibleAgentCount}/{selectedAgents.length}</span></>
                                    ) : (
                                        <>Committee ({selectedAgents.length} agents)</>
                                    )}
                                </h4>

                                <div className="bg-white border-2 border-gray-200 rounded-2xl flex-1 flex flex-col shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 text-center">
                                        <h5 className="font-['Satoshi'] font-bold text-lg text-gray-800">
                                            {isRevealPhase || disputeStep === 7 ? 'Vote Results' : 'Commitment Logs'}
                                        </h5>
                                    </div>
                                    <div className="flex-1 p-3 overflow-y-auto">
                                        <div className="flex flex-col gap-1.5">
                                            {selectedAgents.slice(0, visibleAgentCount).map((agent) => (
                                                <div key={agent} className="flex justify-between items-center px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-all" style={{ animation: currentRound === 1 && isCommitPhase ? 'fadeIn 0.5s ease-out' : undefined }}>
                                                    <span className="font-mono text-gray-600 font-medium text-sm">{agent}</span>
                                                    {agentVotes[agent] ? (
                                                        <span className={`font-bold text-[11px] px-2 py-0.5 rounded ${agentVotes[agent] === 'YES' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {agentVotes[agent]}
                                                        </span>
                                                    ) : (
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-500"><polyline points="20 6 9 17 4 12" /></svg>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-6 my-auto relative z-10">
                                <div className="w-24 h-24 rounded-full bg-gray-200/50 flex items-center justify-center border border-gray-200">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                </div>
                                <p className="font-semibold text-lg text-center max-w-[200px] text-gray-400">
                                    {isDiscussionPhase ? 'locked — awaiting Round 2' : 'unlock after dispute'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ═══ RIGHT: Reveal Phase ═══ */}
                    <div className={`rounded-3xl border-2 flex flex-col p-8 transition-all duration-700 h-full relative overflow-hidden ${isRightUnlocked ? 'bg-white border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.06)]' : 'bg-gray-100 border-gray-200 shadow-inner'}`}>
                        {isRightUnlocked && <div className="absolute inset-0 bg-gradient-to-tr from-gray-50/60 to-transparent pointer-events-none" />}

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className={`font-['Satoshi'] font-bold text-2xl transition-colors ${isRightUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>
                                {currentRound === 2 ? 'Round 2 Reveal' : 'Reveal Phase'}
                            </h3>
                            {/* Chat button only in round 2 */}
                            {isRightUnlocked && currentRound === 2 && (
                                <button onClick={() => setShowDiscussion(true)} className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 border-2 border-gray-300 flex items-center justify-center text-gray-700 shadow-sm hover:shadow-md transition-all">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                </button>
                            )}
                        </div>

                        {isRightUnlocked ? (
                            <div className="relative z-10 flex flex-col flex-1 gap-4">
                                {/* Gauge + Result */}
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                                        <SemiGauge yesPercent={yesPercent} />
                                    </div>
                                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center ${currentRound === 2 && allVotesRevealed ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">
                                                {currentRound === 2 && allVotesRevealed ? 'Consensus Reached' : allVotesRevealed ? 'No Consensus' : 'Revealing...'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {allVotesRevealed
                                                ? currentRound === 2
                                                    ? `Round 2: ${revealedYes}/10 voted YES (${yesPercent}%). Threshold met.`
                                                    : `Round 1: ${revealedYes} YES / ${revealedNo} NO (${yesPercent}%). Need 70% for consensus.`
                                                : `${revealedYes + revealedNo}/${selectedAgents.length} votes revealed...`
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Word cloud + references only in round 2 */}
                                {currentRound === 2 && allVotesRevealed && (
                                    <div className="flex flex-col gap-4">
                                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                                            <h5 className="font-bold text-gray-900 mb-2 text-[15px] font-['Satoshi']">References</h5>
                                            <div className="w-full h-px bg-gray-200 mb-2" />
                                            <div className="flex flex-col gap-1.5">
                                                {['OPEC+ Monthly Report — production quotas', 'IEA Oil Market Report Q1 2026', 'Reuters — Middle East supply disruption', 'Bloomberg Energy — WTI futures curve'].map((ref, i) => (
                                                    <div key={i} className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer flex gap-1.5 items-center">
                                                        <span className="text-gray-400 font-mono text-xs">{`<${i + 1}>`}</span><span>{ref}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                                            <h5 className="font-bold text-gray-900 mb-2 text-[15px] font-['Satoshi']">Word Cloud</h5>
                                            <div className="w-full h-px bg-gray-200 mb-2" />
                                            <div className="flex items-center justify-center p-2 rounded-xl bg-gray-50/50 min-h-[160px] overflow-hidden">
                                                <InteractiveWordCloud />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-6 my-auto relative z-10">
                                <div className="w-24 h-24 rounded-full bg-gray-200/50 flex items-center justify-center border border-gray-200">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                </div>
                                <p className="font-semibold text-lg text-center max-w-[260px] text-gray-400">
                                    {isDiscussionPhase ? 'locked — awaiting Round 2' : isMiddleUnlocked ? 'unlock after commitment phase ends' : 'unlock after dispute'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Discussion Modal */}
            {showDiscussion && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4" onClick={() => setShowDiscussion(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="py-4 px-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[12px] bg-blue-50 flex items-center justify-center text-blue-600">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                </div>
                                <h3 className="font-['Satoshi'] font-bold text-xl text-gray-900">AI Agent Discussion</h3>
                            </div>
                            <button onClick={() => setShowDiscussion(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                            <div className="w-full text-center my-2">
                                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Post Round 1 Discussion</span>
                            </div>
                            {discussionMessages.map((msg, i) => (
                                <div key={i} className="flex flex-col gap-1 w-full max-w-[90%]">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase ml-[52px]">{msg.agent}</span>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[11px] shrink-0 border border-blue-200">
                                            {msg.agent.slice(0, 2)}
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-gray-800 font-medium text-[13px] leading-relaxed">
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="py-4 bg-white text-center text-gray-400 font-medium text-[12px] flex items-center justify-center gap-1.5 shrink-0 border-t border-gray-100/50">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            Discussion finalized. Votes locked by protocol.
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
