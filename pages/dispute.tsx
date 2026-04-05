import Head from 'next/head';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Header from '../components/header/Header';
import { Roboto, Figtree } from "next/font/google";
import dynamic from 'next/dynamic';
import cloud from 'd3-cloud';
import type { AgentDiscussionGraphProps } from '@/components/AgentDiscussionGraph';

const AgentDiscussionGraph = dynamic<AgentDiscussionGraphProps>(
    () => import('@/components/AgentDiscussionGraph'),
    { ssr: false }
);

const roboto = Roboto({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-roboto' });
const figtree = Figtree({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-figtree' });

interface WordNode {
    text: string;
    size: number;
    x?: number;
    y?: number;
    rotate?: number;
    font?: string;
    color?: string;
    weight?: string | number;
    forceRotate?: number;
}

function InteractiveWordCloud({ words: wordData }: { words: WordNode[] }) {
    const [words, setWords] = useState<WordNode[]>([]);
    const width = 1300;
    const height = 580;

    useEffect(() => {
        if (wordData.length === 0) return;
        let seed = 42;
        const seededRand = () => {
            seed = (seed * 1664525 + 1013904223) & 0xffffffff;
            return (seed >>> 0) / 0x100000000;
        };
        const origRandom = Math.random;
        Math.random = seededRand;

        cloud<WordNode>()
            .size([width, height])
            .words(wordData.map(d => ({ ...d })))
            .padding(6)
            .rotate((d: WordNode) => d.forceRotate !== undefined ? d.forceRotate : (seededRand() > 0.5 ? 0 : -90))
            .font("Satoshi")
            .fontSize(d => d.size)
            .on("end", (computedWords) => {
                Math.random = origRandom;
                setWords(computedWords as WordNode[]);
            })
            .start();

        return () => { Math.random = origRandom; };
    }, [wordData]);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full min-h-[160px] overflow-visible">
            <g transform={`translate(${width / 2},${height / 2})`}>
                {words.filter(w => w.x !== undefined && w.y !== undefined).map((w, i) => (
                    <text
                        key={i}
                        textAnchor="middle"
                        transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
                        style={{
                            fontSize: `${w.size}px`,
                            fontFamily: `${w.font}, Impact, system-ui, sans-serif`,
                            fill: w.color,
                            fontWeight: 900,
                            letterSpacing: "-0.02em",
                            transition: "all 0.3s ease"
                        }}
                        className="hover:opacity-70 cursor-pointer drop-shadow-sm"
                    >
                        {w.text}
                    </text>
                ))}
            </g>
        </svg>
    );
}

// Semi-circle gauge that actually draws correctly
function SemiGauge({ yesPercent }: { yesPercent: number }) {
    const noPercent = 100 - yesPercent;
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
            </svg>
            <div className="flex w-full px-2 justify-between font-bold mt-1">
                <span className="text-red-600 font-mono text-sm">{noPercent} No</span>
                <span className="text-emerald-500 font-mono text-sm">{yesPercent} Yes</span>
            </div>
        </div>
    );
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
    const router = useRouter();
    const marketId = (router.query.marketId as string) || "";

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
    const [finalConsensus, setFinalConsensus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [marketQuestion, setMarketQuestion] = useState("What will WTI Crude Oil (WTI) hit in April 2026?");

    // Store raw API responses for the graph
    const [r1Data, setR1Data] = useState<Record<string, unknown> | null>(null);
    const [graphEnlarged, setGraphEnlarged] = useState(false);
    const [r2Data, setR2Data] = useState<Record<string, unknown> | null>(null);

    // Word cloud + references (generated via OpenAI)
    const [wordCloudData, setWordCloudData] = useState<WordNode[]>([]);
    const [references, setReferences] = useState<{ id: number; title: string; url: string; source: string }[]>([]);
    const [insightsLoading, setInsightsLoading] = useState(false);

    // Fetch word cloud + references from OpenAI based on discussion messages
    const fetchInsights = useCallback(async (msgs: { agent: string; text: string }[], question: string) => {
        if (msgs.length === 0) return;
        setInsightsLoading(true);
        try {
            const res = await fetch("/api/commands/generate-insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: msgs, question }),
            });
            const data = await res.json();
            if (data.success) {
                setWordCloudData(data.wordCloud || []);
                setReferences(data.references || []);
            }
        } catch (err) {
            console.error("Failed to fetch insights:", err);
        } finally {
            setInsightsLoading(false);
        }
    }, []);

    // Animate commits appearing one by one
    const animateAgents = useCallback((agents: string[], delay: number) => {
        setVisibleAgentCount(0);
        let count = 0;
        const interval = setInterval(() => {
            count++;
            setVisibleAgentCount(count);
            if (count >= agents.length) clearInterval(interval);
        }, delay);
    }, []);

    // Animate votes appearing one by one, then force-set all at end
    const animateReveals = useCallback((agents: string[], votes: Record<string, "YES" | "NO">, onDone: () => void) => {
        let count = 0;
        const interval = setInterval(() => {
            const agent = agents[count];
            if (agent) setAgentVotes(prev => ({ ...prev, [agent]: votes[agent] }));
            count++;
            if (count >= agents.length) {
                clearInterval(interval);
                // Force-set ALL votes to ensure none are left as ticks
                setAgentVotes({ ...votes });
                setAllVotesRevealed(true);
                setTimeout(onDone, 2000);
            }
        }, 600);
    }, []);

    // ── DISPUTE BUTTON: calls resolve-1, animates results ──
    const startDispute = useCallback(async () => {
        if (!marketId) { alert("No marketId. Add ?marketId=mkt-xxx to the URL."); return; }
        setLoading(true);
        setCurrentRound(1);
        setDisputeStep(2);
        setCommitTimeLeft(10);
        setAgentVotes({});
        setAllVotesRevealed(false);
        setRound1Result(null);

        try {
            const res = await fetch("/api/commands/resolve-1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ marketId, committeeSize: 5 }),
            });
            const data = await res.json();
            setR1Data(data);
            if (data.question) setMarketQuestion(data.question);

            // Extract agents from committee
            const agents = (data.committee || []).map((c: { name: string }) => c.name);
            setSelectedAgents(agents);

            // Animate agents appearing
            animateAgents(agents, 400);

            // Wait for agents to appear, then show commits
            await new Promise(r => setTimeout(r, agents.length * 400 + 500));
            setCommitTimeLeft(0);

            // Wait a beat, then reveal votes
            await new Promise(r => setTimeout(r, 800));
            setDisputeStep(3);
            setAllVotesRevealed(false);

            // Build votes from reveal data
            const revealPhase = (data.phases || []).find((p: { phase: string }) => p.phase === "phase_1_reveal");
            const votes: Record<string, "YES" | "NO"> = {};
            if (revealPhase?.reveals) {
                for (const r of revealPhase.reveals) votes[r.agent] = r.vote;
            }

            // Animate reveals
            animateReveals(agents, votes, () => {
                const yes = Object.values(votes).filter(v => v === "YES").length;
                const no = Object.values(votes).filter(v => v === "NO").length;
                setRound1Result({ yes, no });

                if (data.resolved) {
                    setFinalConsensus(data.consensus);
                    setDisputeStep(7);
                } else {
                    // Extract discussion messages from resolve-1 reasoning
                    const msgs: { agent: string; text: string }[] = [];
                    if (revealPhase?.reveals) {
                        for (const r of revealPhase.reveals) {
                            if (r.reasoning) msgs.push({ agent: r.agent, text: r.reasoning });
                        }
                    }
                    setDiscussionMessages(msgs);
                    fetchInsights(msgs, marketQuestion);
                    setDisputeStep(4);
                }
                setLoading(false);
            });
        } catch (err) {
            console.error("Dispute failed:", err);
            setLoading(false);
        }
    }, [marketId, animateAgents, animateReveals]);

    // ── ROUND 2 BUTTON: calls resolve-2, animates results ──
    const startRound2 = useCallback(async () => {
        if (!marketId) return;
        setLoading(true);
        setCurrentRound(2);
        setAgentVotes({});
        setAllVotesRevealed(false);
        setCommitTimeLeft(10);
        setDisputeStep(5);
        setVisibleAgentCount(selectedAgents.length); // show all agents immediately

        try {
            const res = await fetch("/api/commands/resolve-2", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ marketId, committeeSize: 5, committeeNames: selectedAgents }),
            });
            const data = await res.json();
            setR2Data(data);

            // Extract discussion messages
            const msgs: { agent: string; text: string }[] = [];
            const disc1 = (data.phases || []).find((p: { phase: string }) => p.phase === "discussion_round_1");
            if (disc1?.views) {
                for (const v of disc1.views) msgs.push({ agent: v.agent, text: (v.view || "") });
            }
            const disc2 = (data.phases || []).find((p: { phase: string }) => p.phase === "discussion_round_2");
            if (disc2?.responses) {
                for (const r of disc2.responses) msgs.push({ agent: r.agent, text: (r.response || "") });
            }
            setDiscussionMessages(msgs);
            fetchInsights(msgs, marketQuestion);
            // Auto-open discussion modal so user sees chat in real-time
            if (msgs.length > 0) setShowDiscussion(true);

            // Wait for commit timer
            await new Promise(r => setTimeout(r, 2000));
            setCommitTimeLeft(0);

            // Reveal
            await new Promise(r => setTimeout(r, 800));
            setDisputeStep(6);
            setAllVotesRevealed(false);

            // Build votes from phase 2 reveal
            const revealPhase = (data.phases || []).find((p: { phase: string }) => p.phase === "phase_2_reveal");
            const votes: Record<string, "YES" | "NO"> = {};
            const agents = (data.committee || []).map((c: { name: string }) => c.name);
            if (revealPhase?.reveals) {
                for (const r of revealPhase.reveals) votes[r.agent] = r.vote;
            }

            animateReveals(agents, votes, () => {
                if (data.resolved) {
                    setFinalConsensus(data.consensus);
                    setDisputeStep(7);
                }
                setLoading(false);
            });
        } catch (err) {
            console.error("Round 2 failed:", err);
            setLoading(false);
        }
    }, [marketId, selectedAgents, animateReveals]);

    const handleFastForward = (e: React.MouseEvent) => { e.stopPropagation(); setCommitTimeLeft(0); };

    const isCommitPhase = disputeStep === 2 || disputeStep === 5;
    const isRevealPhase = disputeStep === 3 || disputeStep === 6;
    const isMiddleUnlocked = disputeStep >= 2 && disputeStep !== 4;
    const isRightUnlocked = isRevealPhase || disputeStep === 7;
    const isDiscussionPhase = disputeStep === 4;

    const trackerStep = disputeStep === 0 ? 0 : disputeStep <= 3 ? 2 : disputeStep === 4 ? 3 : disputeStep <= 6 ? 4 : 5;

    // Map disputeStep → AgentDiscussionGraph stage (1-5)
    // Phase 1 (resolve-1): stage 0=selection(2), stage 1=R1 votes(4)
    // Phase 2 (resolve-2): stage 3=discussion(5), stage 4=decision(5+consensus)
    const graphStage: 1 | 2 | 3 | 4 | 5 =
        disputeStep === 0 ? 1 :            // idle
        disputeStep === 2 ? 2 :            // R1 commit → selection animation (auto → fading → voting)
        disputeStep === 3 ? 4 :            // R1 reveal → voting colors
        disputeStep === 4 ? 4 :            // discussion text → stays at voting
        disputeStep >= 5 ? 5 :             // R2 → discussion (truth node appears when consensus set)
        1;

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
                            {marketQuestion}
                        </h1>
                        {marketId && <p className="text-sm text-gray-400 font-mono mt-1">{marketId}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ═══ LEFT: Outcome + Tracker ═══ */}
                    <div className="flex flex-col gap-6">
                        {/* Outcome hero */}
                        <div className="bg-white rounded-3xl p-8 flex flex-col items-center justify-center text-center border border-gray-200 shadow-sm h-[200px]">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg transition-all duration-1000 ${disputeStep >= 7 && finalConsensus === 'YES' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-[#EF5A5A] shadow-red-200'}`}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <h2 className={`font-['Satoshi'] font-bold text-2xl mb-1 tracking-wide transition-colors duration-1000 ${disputeStep >= 7 && finalConsensus === 'YES' ? 'text-emerald-500' : 'text-[#EF5A5A]'}`}>
                                Outcome: {disputeStep >= 7 ? (finalConsensus === 'YES' ? 'Yes' : 'No') : 'No'}
                            </h2>
                            <p className="text-gray-500 font-medium text-sm">March 15</p>
                        </div>

                        {/* Outcome bar */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="font-['Satoshi'] font-bold text-gray-900 text-sm">Outcome</span>
                                <span className="text-xs font-semibold">
                                    <span className="text-emerald-500">{disputeStep >= 7 ? yesPercent : OUTCOME_INDEX_PERCENT.yes}% yes</span>
                                    <span className="text-gray-400"> · </span>
                                    <span className="text-red-500">{disputeStep >= 7 ? (100 - yesPercent) : OUTCOME_INDEX_PERCENT.no}% no</span>
                                </span>
                            </div>
                            <div className="relative h-8 w-full rounded-full border border-gray-200 overflow-hidden bg-gray-50">
                                <div className="absolute inset-y-0 left-0 bg-emerald-400 transition-all duration-1000" style={{ width: `${disputeStep >= 7 ? yesPercent : OUTCOME_INDEX_PERCENT.yes}%` }} />
                                <div className="absolute inset-y-0 bg-red-400/92 transition-all duration-1000" style={{ left: `${disputeStep >= 7 ? yesPercent : OUTCOME_INDEX_PERCENT.yes}%`, right: 0 }} />
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
                                    <button onClick={startDispute} disabled={loading || !marketId} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-2">
                                        {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                        {loading ? 'Running...' : 'Dispute & Submit Bond'}
                                    </button>
                                </div>
                            )}

                            {disputeStep === 4 && (
                                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">No consensus. Proceed to Round 2.</span>
                                    <button onClick={startRound2} disabled={loading} className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-2">
                                        {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                        {loading ? 'Discussing...' : 'Start Round 2'}
                                    </button>
                                </div>
                            )}

                            {disputeStep >= 7 && (() => {
                                const finalData = r2Data || r1Data;
                                const consensus = (finalData as Record<string, unknown>)?.consensus as string || "YES";
                                const repUpdates = (finalData as Record<string, unknown>)?.reputationUpdates as { agent: string; change: number; newRep: number; correct: boolean }[] || [];
                                return (
                                    <div className="mt-5 pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            </div>
                                            <span className="text-xs font-bold text-gray-900">Market resolved: <span className="text-blue-500">{consensus}</span></span>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                                            <div className="text-xs font-bold text-green-700 mb-0.5">Dispute successful</div>
                                            <p className="text-xs text-green-600">Outcome changed. Bond of <span className="font-bold">750 USDC</span> returned.</p>
                                        </div>
                                        {repUpdates.length > 0 && (
                                            <div className="mt-2">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reputation</div>
                                                {repUpdates.map((u, i) => (
                                                    <div key={i} className="flex justify-between text-[11px] py-0.5">
                                                        <span className="text-gray-600">{u.agent}</span>
                                                        <span className={u.correct ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                                                            {u.change >= 0 ? '+' : ''}{u.change} → {u.newRep}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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

                                <div className="bg-white border-2 border-gray-200 rounded-2xl flex flex-col shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 text-center">
                                        <h5 className="font-['Satoshi'] font-bold text-lg text-gray-800">
                                            {isRevealPhase || disputeStep === 7 ? 'Vote Results' : 'Commitment Logs'}
                                        </h5>
                                    </div>
                                    <div className="p-3">
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

                                {/* Chat logs button */}
                                {discussionMessages.length > 0 && (
                                    <button onClick={() => setShowDiscussion(true)} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all shadow-sm hover:shadow-md">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                        View Chat Logs ({discussionMessages.length} messages)
                                    </button>
                                )}

                                {/* 3D Linkage Graph — always visible, click to enlarge */}
                                <div
                                    className="mt-4 rounded-2xl overflow-hidden border border-gray-800 shadow-sm cursor-pointer hover:border-gray-600 transition-all"
                                    style={{ height: 400 }}
                                    onClick={() => setGraphEnlarged(true)}
                                >
                                    <AgentDiscussionGraph stage={graphStage} agentNames={selectedAgents} agentVotes={agentVotes as Record<string, "YES" | "NO">} consensus={finalConsensus as "YES" | "NO" | null} />
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
                                            <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center ${allVotesRevealed && finalConsensus ? 'bg-emerald-500' : allVotesRevealed ? 'bg-red-500' : 'bg-gray-400'}`}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">
                                                {allVotesRevealed && finalConsensus ? 'Consensus Reached' : allVotesRevealed ? 'No Consensus' : 'Revealing...'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {allVotesRevealed
                                                ? `Round ${currentRound}: ${revealedYes}/${selectedAgents.length} voted YES (${yesPercent}%).${finalConsensus ? ' Threshold met.' : ' Need 70% for consensus.'}`
                                                : `${revealedYes + revealedNo}/${selectedAgents.length} votes revealed...`
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* References */}
                                {(references.length > 0 || insightsLoading) && (
                                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col max-h-[280px]">
                                        <h5 className="font-bold text-gray-900 mb-2 text-[15px] font-['Satoshi'] tracking-wide">References</h5>
                                        <div className="w-full h-px bg-gray-200 mb-3" />
                                        {insightsLoading ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                                                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                                                Generating references...
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
                                                {references.map((ref) => (
                                                    <a key={ref.id} href={ref.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer flex gap-1.5 items-start">
                                                        <span className="text-gray-400 font-mono text-xs shrink-0">{`<${ref.id}>`}</span>
                                                        <span className="leading-snug">{ref.title} <span className="text-gray-400">— {ref.source}</span></span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Word Cloud */}
                                {(wordCloudData.length > 0 || insightsLoading) && (
                                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col">
                                        <h5 className="font-bold text-gray-900 mb-2 text-[15px] font-['Satoshi'] tracking-wide">Word Cloud</h5>
                                        <div className="w-full h-px bg-gray-200 mb-3" />
                                        <div className="flex-1 flex flex-wrap items-center justify-center p-2 rounded-xl bg-gray-50/50 min-h-[160px] w-full overflow-hidden relative">
                                            {insightsLoading ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                                                    Generating word cloud...
                                                </div>
                                            ) : (
                                                <InteractiveWordCloud words={wordCloudData} />
                                            )}
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

            {/* Discussion Modal — wide: chat left, linkage graph right */}
            {showDiscussion && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4" onClick={() => setShowDiscussion(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-[1400px] h-[85vh] max-h-[800px] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
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

                        {/* Body: chat */}
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-full flex flex-col">
                                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                                    <div className="w-full text-center my-2">
                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Post Round 1 Discussion</span>
                                    </div>
                                    {discussionMessages.map((msg, i) => {
                                        const vote = agentVotes[msg.agent];
                                        const isYes = vote === "YES";
                                        return (
                                            <div key={i} className="flex flex-col gap-1 w-full max-w-[700px] mx-auto">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase ml-[52px]">{msg.agent}</span>
                                                <div className="flex gap-3 items-start">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 border ${isYes ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                        {msg.agent.slice(0, 2)}
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-gray-800 font-medium text-[13px] leading-relaxed">
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="py-3 bg-white text-center text-gray-400 font-medium text-[12px] flex items-center justify-center gap-1.5 shrink-0 border-t border-gray-100/50">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    Discussion finalized. Votes locked by protocol.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enlarged Graph Modal */}
            {graphEnlarged && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={() => setGraphEnlarged(false)}>
                    <div className="w-[95vw] h-[90vh] rounded-2xl overflow-hidden border border-gray-700" onClick={e => e.stopPropagation()}>
                        <AgentDiscussionGraph stage={graphStage} agentNames={selectedAgents} agentVotes={agentVotes as Record<string, "YES" | "NO">} consensus={finalConsensus as "YES" | "NO" | null} />
                    </div>
                    <button onClick={() => setGraphEnlarged(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
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
