import Head from 'next/head';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
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

// ── Linkage Graph (SVG) ──────────────────────────────────────

const AGENT_REFERENCES: Record<string, string[]> = {
    ResearchBot: ["Reuters", "Bloomberg"], CritiqueBot: ["OPEC+", "IEA"],
    MarketBot: ["CME", "EIA"], DataBot: ["WorldBank", "IMF"],
    SentinelBot: ["UN", "Sanctions"], OracleAlpha: ["AP News", "Fed"],
    TruthSeeker: ["FactCheck", "Snopes"], RiskAnalyst: ["VIX", "CDS"],
    DeepDive: ["ArXiv", "Paper"], ConsensusAI: ["Delphi", "Survey"],
    FactChecker: ["Reuters", "AFP"], TrendWatcher: ["Trends", "X"],
    PolicyBot: ["Congress", "EU"], ArbitrageAI: ["Polymarket", "Kalshi"],
    SignalBot: ["TradingView", "Coinglass"],
};

const AGENT_REP: Record<string, number> = {
    ResearchBot: 18, CritiqueBot: 15, MarketBot: 14, DataBot: 12, SentinelBot: 11,
    OracleAlpha: 16, TruthSeeker: 13, RiskAnalyst: 17, DeepDive: 10, ConsensusAI: 14,
    FactChecker: 15, TrendWatcher: 11, PolicyBot: 13, ArbitrageAI: 12, SignalBot: 10,
};

// Generate rich cross-agent discussion links with message snippets
function buildAgentLinks(agents: string[], votes: Record<string, "YES" | "NO" | null>) {
    const links: { from: number; to: number; msg: string }[] = [];
    const snippets = [
        "I agree with your supply analysis",
        "Your demand data contradicts mine",
        "The sanctions evidence you cited is outdated",
        "Good point on tail risk — I'm revising",
        "Your OPEC+ reference confirms my thesis",
        "I challenge your resolution criteria",
        "The IEA data supports this position",
        "Counter: Bloomberg shows opposite trend",
        "Reviewing your futures curve argument",
        "I concur on the geopolitical factor",
        "Your confidence is too high given uncertainty",
        "Strong evidence — shifting my vote",
        "Disagree: the fundamentals don't support this",
        "Cross-referencing with my oracle endpoints",
        "Your source is unverified — flagging",
    ];
    // Create many links — every agent talks to 3–5 others
    let si = 0;
    for (let i = 0; i < agents.length; i++) {
        const numLinks = 3 + Math.floor(Math.random() * 3);
        const targets = [...Array(agents.length).keys()].filter(j => j !== i).sort(() => Math.random() - 0.5).slice(0, numLinks);
        for (const j of targets) {
            if (!links.some(l => (l.from === i && l.to === j) || (l.from === j && l.to === i))) {
                const fromVote = votes[agents[i]];
                const toVote = votes[agents[j]];
                const isAgreement = fromVote === toVote;
                links.push({ from: i, to: j, msg: `${agents[i]} → ${agents[j]}: ${isAgreement ? snippets[si % snippets.length] : snippets[(si + 7) % snippets.length]}` });
                si++;
            }
        }
    }
    return links;
}

function LinkageGraph3D({
    agents, votes, messages, finalOutcome,
}: {
    agents: string[];
    votes: Record<string, "YES" | "NO" | null>;
    messages: { agent: string; text: string }[];
    finalOutcome: "YES" | "NO" | null;
}) {
    const [hoveredAgent, setHoveredAgent] = useState<number | null>(null);
    const [hoveredLink, setHoveredLink] = useState<number | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const svgRef = React.useRef<SVGSVGElement>(null);

    const cx = 400, cy = 340, agentRadius = 200, refRadius = 55;

    const agentPositions = agents.map((name, i) => {
        const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
        const rep = AGENT_REP[name] || 12;
        return { name, x: cx + agentRadius * Math.cos(angle), y: cy + agentRadius * Math.sin(angle), size: 14 + (rep - 10) * 2, vote: votes[name], refs: AGENT_REFERENCES[name] || ["Src A", "Src B"], angle, rep };
    });

    // Build rich links from discussion messages + generated cross-talk
    const agentLinks = React.useMemo(() => {
        const fromMessages: { from: number; to: number; msg: string }[] = [];
        messages.forEach(msg => {
            const fromIdx = agents.indexOf(msg.agent);
            if (fromIdx === -1) return;
            agents.forEach((other, toIdx) => {
                if (other !== msg.agent && msg.text.includes(other)) {
                    fromMessages.push({ from: fromIdx, to: toIdx, msg: `${msg.agent}: "${msg.text.slice(0, 80)}..."` });
                }
            });
        });
        const generated = buildAgentLinks(agents, votes);
        // Merge, deduplicate
        const all = [...fromMessages];
        for (const g of generated) {
            if (!all.some(l => (l.from === g.from && l.to === g.to) || (l.from === g.to && l.to === g.from))) {
                all.push(g);
            }
        }
        return all;
    }, [agents, messages, votes]);

    const truthColor = finalOutcome === "YES" ? "#34d399" : finalOutcome === "NO" ? "#f87171" : "#a3a3a3";

    // Is this link related to hovered/selected agent?
    const isLinkVisible = (link: { from: number; to: number }) => {
        if (hoveredAgent !== null) return link.from === hoveredAgent || link.to === hoveredAgent;
        if (selectedAgent !== null) return link.from === selectedAgent || link.to === selectedAgent;
        return false; // hide all by default
    };

    // Is this ref visible?
    const isRefVisible = (agentIdx: number) => {
        return hoveredAgent === agentIdx || selectedAgent === agentIdx;
    };

    // Zoom with scroll
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.max(0.5, Math.min(4, z * delta)));
    };

    // Pan with drag
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 && !e.shiftKey) {
            setDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragging) {
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };
    const handleMouseUp = () => setDragging(false);

    // Reset view
    const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedAgent(null); };

    // Zoom to agent
    const zoomToAgent = (idx: number) => {
        const a = agentPositions[idx];
        setSelectedAgent(idx === selectedAgent ? null : idx);
        if (idx !== selectedAgent) {
            setZoom(2.5);
            setPan({ x: -(a.x - 400) * 2.5 + 0, y: -(a.y - 340) * 2.5 + 0 });
        } else {
            resetView();
        }
    };

    const viewBox = `${-pan.x / zoom + 400 - 400 / zoom} ${-pan.y / zoom + 340 - 340 / zoom} ${800 / zoom} ${680 / zoom}`;

    return (
        <div className="w-full h-full relative" style={{ cursor: dragging ? 'grabbing' : 'grab' }}>
            <svg ref={svgRef} viewBox={viewBox} className="w-full h-full"
                onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

                {/* Truth-to-agent lines (always visible, dim) */}
                {agentPositions.map((a, i) => (
                    <line key={`truth-${i}`} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="#374151" strokeWidth="0.8" strokeDasharray="4 4" opacity={hoveredAgent === i || selectedAgent === i ? 0.6 : 0.15} />
                ))}

                {/* Agent-to-agent links — only visible on hover/select */}
                {agentLinks.map((link, i) => {
                    const a = agentPositions[link.from], b = agentPositions[link.to];
                    const visible = isLinkVisible(link);
                    if (!visible) return null;
                    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
                    return (
                        <g key={`link-${i}`}
                            onMouseEnter={(e) => { setHoveredLink(i); setTooltip({ x: e.clientX, y: e.clientY, text: link.msg }); }}
                            onMouseLeave={() => { setHoveredLink(null); setTooltip(null); }}
                        >
                            {/* Wider invisible hit area */}
                            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth="12" />
                            {/* Visible line */}
                            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                stroke={hoveredLink === i ? "#facc15" : "#fbbf24"} strokeWidth={hoveredLink === i ? 2.5 : 1.5}
                                opacity={hoveredLink === i ? 1 : 0.6} strokeDasharray="6 3"
                                style={{ transition: 'all 0.2s' }} />
                            {/* Small dot at midpoint */}
                            <circle cx={midX} cy={midY} r={hoveredLink === i ? 4 : 2} fill="#fbbf24" opacity={hoveredLink === i ? 1 : 0.5} style={{ transition: 'all 0.2s' }} />
                        </g>
                    );
                })}

                {/* Reference sub-nodes — only visible on hover/select */}
                {agentPositions.map((a, i) => {
                    if (!isRefVisible(i)) return null;
                    const stroke = a.vote === "YES" ? "#34d399" : a.vote === "NO" ? "#f87171" : "#6b7280";
                    return a.refs.map((ref, ri) => {
                        const refAngle = a.angle + ((ri - (a.refs.length - 1) / 2) * 0.45);
                        const rx = a.x + refRadius * Math.cos(refAngle), ry = a.y + refRadius * Math.sin(refAngle);
                        return (
                            <g key={`ref-${i}-${ri}`} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                <line x1={a.x} y1={a.y} x2={rx} y2={ry} stroke={stroke} strokeWidth="1" opacity="0.5" />
                                <circle cx={rx} cy={ry} r={7} fill="#1f2937" stroke={stroke} strokeWidth="1.5"
                                    className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setTooltip({ x: e.clientX, y: e.clientY, text: `Source: ${ref} — cited by ${a.name} (${a.vote})` }); setTimeout(() => setTooltip(null), 3000); }} />
                                <text x={rx} y={ry + 17} textAnchor="middle" fontSize="7" fill="#d1d5db" fontFamily="monospace" fontWeight="600">{ref}</text>
                            </g>
                        );
                    });
                })}

                {/* Agent nodes */}
                {agentPositions.map((a, i) => {
                    const isActive = hoveredAgent === i || selectedAgent === i;
                    const fill = a.vote === "YES" ? "#065f46" : a.vote === "NO" ? "#991b1b" : "#374151";
                    const stroke = a.vote === "YES" ? "#34d399" : a.vote === "NO" ? "#f87171" : "#6b7280";
                    const glowR = isActive ? a.size + 8 : 0;
                    return (
                        <g key={`agent-${i}`}
                            onMouseEnter={() => setHoveredAgent(i)}
                            onMouseLeave={() => { if (selectedAgent !== i) setHoveredAgent(null); }}
                            onClick={(e) => { e.stopPropagation(); zoomToAgent(i); }}
                            className="cursor-pointer"
                        >
                            {/* Glow ring on hover */}
                            {isActive && <circle cx={a.x} cy={a.y} r={glowR} fill="transparent" stroke={stroke} strokeWidth="1" opacity="0.3" style={{ animation: 'fadeIn 0.2s' }} />}
                            {/* Main circle */}
                            <circle cx={a.x} cy={a.y} r={isActive ? a.size + 3 : a.size} fill={fill} stroke={stroke}
                                strokeWidth={isActive ? 3.5 : 2} style={{ transition: 'all 0.2s' }} />
                            {/* Name */}
                            <text x={a.x} y={a.y - 3} textAnchor="middle" fontSize={isActive ? 9 : 8} fill="white" fontWeight="700" fontFamily="monospace">
                                {a.name.length > 10 ? a.name.slice(0, 9) + '..' : a.name}
                            </text>
                            {/* Vote */}
                            <text x={a.x} y={a.y + 8} textAnchor="middle" fontSize="7" fill={stroke} fontWeight="600" fontFamily="monospace">
                                {a.vote || '?'}
                            </text>
                            {/* Rep badge */}
                            {isActive && (
                                <text x={a.x} y={a.y + a.size + 14} textAnchor="middle" fontSize="7" fill="#9ca3af" fontFamily="monospace">
                                    REP: {a.rep}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Center: TRUTH node */}
                <g className="cursor-pointer" onClick={resetView}>
                    <circle cx={cx} cy={cy} r={36} fill="#111827" stroke={truthColor} strokeWidth="3" />
                    <circle cx={cx} cy={cy} r={28} fill="transparent" stroke={truthColor} strokeWidth="1" opacity="0.3" />
                    <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="white" fontWeight="900">TRUTH</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill={truthColor} fontWeight="700" fontFamily="monospace">{finalOutcome || 'PENDING'}</text>
                </g>

                {/* Legend */}
                <g transform={`translate(${-pan.x / zoom + 400 - 400 / zoom + 10}, ${-pan.y / zoom + 340 - 340 / zoom + 10})`}>
                    <rect x={0} y={0} width={130} height={90} rx={6} fill="#111827" opacity="0.8" />
                    <circle cx={12} cy={14} r={5} fill="#065f46" stroke="#34d399" strokeWidth="1" /><text x={24} y={17} fontSize="8" fill="#9ca3af" fontFamily="monospace">YES vote</text>
                    <circle cx={12} cy={30} r={5} fill="#991b1b" stroke="#f87171" strokeWidth="1" /><text x={24} y={33} fontSize="8" fill="#9ca3af" fontFamily="monospace">NO vote</text>
                    <line x1={6} y1={46} x2={18} y2={46} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" /><text x={24} y={49} fontSize="8" fill="#9ca3af" fontFamily="monospace">Discussion</text>
                    <circle cx={12} cy={62} r={4} fill="#1f2937" stroke="#6b7280" strokeWidth="1" /><text x={24} y={65} fontSize="8" fill="#9ca3af" fontFamily="monospace">Reference</text>
                    <text x={8} y={80} fontSize="7" fill="#6b7280" fontFamily="monospace">Hover node | Scroll zoom</text>
                </g>
            </svg>

            {/* Floating tooltip */}
            {tooltip && (
                <div className="fixed z-[10000] pointer-events-none" style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
                    <div className="bg-gray-900 text-white text-[11px] font-medium px-3 py-2 rounded-lg shadow-xl border border-gray-700 max-w-[300px] leading-relaxed">
                        {tooltip.text}
                    </div>
                </div>
            )}

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-3 flex gap-1.5">
                <button onClick={() => setZoom(z => Math.min(4, z * 1.3))} className="w-7 h-7 rounded bg-gray-800/80 text-white text-sm font-bold hover:bg-gray-700 border border-gray-600">+</button>
                <button onClick={() => setZoom(z => Math.max(0.5, z * 0.7))} className="w-7 h-7 rounded bg-gray-800/80 text-white text-sm font-bold hover:bg-gray-700 border border-gray-600">-</button>
                <button onClick={resetView} className="h-7 px-2 rounded bg-gray-800/80 text-white text-[10px] font-bold hover:bg-gray-700 border border-gray-600">Reset</button>
            </div>
        </div>
    );
}

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
    const [loading, setLoading] = useState(false);
    const [marketQuestion, setMarketQuestion] = useState("What will WTI Crude Oil (WTI) hit in April 2026?");

    // Store raw API responses for the graph
    const [r1Data, setR1Data] = useState<Record<string, unknown> | null>(null);
    const [r2Data, setR2Data] = useState<Record<string, unknown> | null>(null);

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
                body: JSON.stringify({ marketId, committeeSize: 5 }),
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

                                {/* Linkage Graph — below commitment logs */}
                                {(isRevealPhase || disputeStep === 4 || disputeStep === 7) && selectedAgents.length > 0 && (
                                    <div className="mt-4 bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-sm" style={{ height: 400 }}>
                                        <LinkageGraph3D
                                            agents={selectedAgents}
                                            votes={agentVotes}
                                            messages={discussionMessages}
                                            finalOutcome={disputeStep >= 7 ? ((r2Data as Record<string, unknown>)?.consensus as "YES" | "NO") || ((r1Data as Record<string, unknown>)?.consensus as "YES" | "NO") || null : null}
                                        />
                                    </div>
                                )}
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

                        {/* Body: chat + graph side by side */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left: Chat */}
                            <div className="w-1/2 border-r border-gray-100 flex flex-col">
                                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                                    <div className="w-full text-center my-2">
                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Post Round 1 Discussion</span>
                                    </div>
                                    {discussionMessages.map((msg, i) => {
                                        const vote = agentVotes[msg.agent];
                                        const isYes = vote === "YES";
                                        return (
                                            <div key={i} className="flex flex-col gap-1 w-full max-w-[95%]">
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

                            {/* Right: Linkage Graph */}
                            <div className="w-1/2 bg-gray-950 flex items-center justify-center overflow-hidden relative">
                                <LinkageGraph3D
                                    agents={selectedAgents}
                                    votes={agentVotes}
                                    messages={discussionMessages}
                                    finalOutcome={disputeStep >= 7 ? "YES" : null}
                                />
                            </div>
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
