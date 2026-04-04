import Head from 'next/head';
import React, { useState, useEffect } from 'react';
import Header from '../components/header/Header';
import { Roboto, Figtree } from "next/font/google";
import cloud from 'd3-cloud';

const roboto = Roboto({
    weight: ['400', '500', '700'],
    subsets: ['latin'],
    variable: '--font-roboto',
});

const figtree = Figtree({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    variable: '--font-figtree',
});

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
    { text: "Bid", size: 36, color: "#28a745", weight: 900 },
    { text: "Ask", size: 36, color: "#b91c1c", weight: 900 },
    { text: "ROI", size: 36, color: "#c2410c", weight: 900 },
    { text: "Data", size: 34, color: "#212529", weight: 900 },
    { text: "Oracle", size: 31, color: "#066a9c", weight: 900 },
    { text: "Crowd", size: 34, color: "#212529", weight: 900 },
    { text: "Resolution", size: 31, color: "#6c757d", weight: 800 },
    { text: "Long", size: 34, color: "#28a745", weight: 900 },
    { text: "Short", size: 34, color: "#b91c1c", weight: 900 },
    { text: "Speculation", size: 29, color: "#c2410c", weight: 800 },
    { text: "Truth", size: 29, color: "#111623", weight: 900 },
    { text: "Wisdom", size: 29, color: "#212529", weight: 800 },
    { text: "oil", size: 26, color: "#6c757d", weight: 800 },
    { text: "scam", size: 26, color: "#b91c1c", weight: 800 },
    { text: "Insight", size: 24, color: "#6c757d", weight: 800 },
    { text: "Hedge", size: 26, color: "#28a745", weight: 800 },
    { text: "Bear", size: 26, color: "#b91c1c", weight: 900 },
    { text: "Bull", size: 26, color: "#28a745", weight: 900 },
    { text: "liquidity", size: 24, color: "#6c757d", weight: 800 },
    { text: "Spread", size: 24, color: "#066a9c", weight: 800 },
    { text: "Proof", size: 24, color: "#6c757d", weight: 800 },
    { text: "Macro", size: 24, color: "#212529", weight: 800 },
    { text: "Signals", size: 24, color: "#28a745", weight: 800 },
    { text: "Positions", size: 24, color: "#6c757d", weight: 800 },
    { text: "Betting", size: 24, color: "#212529", weight: 800 },
    { text: "contracts", size: 22, color: "#6c757d", weight: 700 },
    { text: "future", size: 22, color: "#6c757d", weight: 700 },
    { text: "Decentralized", size: 22, color: "#066a9c", weight: 700 },
    { text: "Validation", size: 22, color: "#6c757d", weight: 700 },
    { text: "arbitrage", size: 22, color: "#6c757d", weight: 700 },
    { text: "Yield", size: 22, color: "#c2410c", weight: 700 },
    { text: "Margin", size: 22, color: "#6c757d", weight: 700 },
    { text: "Alpha", size: 24, color: "#066a9c", weight: 800 },
    { text: "Outcome", size: 19, color: "#212529", weight: 700 },
    { text: "Capital", size: 19, color: "#066a9c", weight: 700 },
    { text: "Beta", size: 19, color: "#6c757d", weight: 700 },
    { text: "Trustless", size: 19, color: "#6c757d", weight: 700 },
    { text: "Risks", size: 19, color: "#b91c1c", weight: 700 },
    { text: "Limit", size: 19, color: "#6c757d", weight: 700 },
    { text: "Ledger", size: 19, color: "#6c757d", weight: 700 },
    { text: "settlement", size: 19, color: "#6c757d", weight: 700 },
    { text: "wager", size: 19, color: "#6c757d", weight: 700 },
    { text: "history", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Smart Contract", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Variance", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Shares", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Metrics", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Pyschology", size: 19, color: "#6c757d", weight: 700 },
    { text: "Noise", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Index", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Node", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Slippage", size: 17, color: "#9ca3af", weight: 700 },
    { text: "API", size: 17, color: "#9ca3af", weight: 700 },
    { text: "Axiom", size: 14, color: "#9ca3af", weight: 700 },
];


function InteractiveWordCloud() {
    const [words, setWords] = useState<WordNode[]>([]);
    const width = 1300;
    const height = 580;

    useEffect(() => {
        cloud<WordNode>()
            .size([width, height])
            .words(cloudWordsData.map(d => ({ ...d })))
            .padding(6)
            .rotate((d: WordNode) => d.forceRotate !== undefined ? d.forceRotate : (Math.random() > 0.5 ? 0 : -90))
            .font("Satoshi")
            .fontSize(d => d.size)
            .on("end", (computedWords) => {
                setWords(computedWords as WordNode[]);
            })
            .start();
    }, []);

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

export default function DisputePage() {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10);
    const [showDiscussion, setShowDiscussion] = useState(false);

    useEffect(() => {
        if (isUnlocked && timeLeft > 0) {
            const timerId = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timerId);
        }
    }, [isUnlocked, timeLeft]);

    const handleFastForward = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTimeLeft(0);
    };

    return (
        <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
            <Head>
                <title>Dispute | Ethereum Explorer</title>
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
            </Head>

            <Header />

            <main className="w-[96%] max-w-[1800px] mx-auto mt-12 pb-16">

                {/* Header (Matching Event Page Style) */}
                <div className="flex items-start gap-4 mb-10 border-b border-gray-200 pb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center shrink-0 shadow-sm border border-gray-800">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 22C7.58172 22 4 18.4183 4 14C4 9.58172 12 2 12 2C12 2 20 9.58172 20 14C20 18.4183 16.4183 22 12 22Z" /></svg>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-1 tracking-wide">
                            <span className="uppercase">Finance</span>
                            <span>&middot;</span>
                            <span className="uppercase">Monthly</span>
                        </div>
                        <h1 className="font-['Satoshi'] text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                            What will WTI Crude Oil (WTI) hit in April 2026?
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column */}
                    <div className="flex flex-col gap-6">

                        {/* Outcome Box (Dark theme to match reference Image 2) */}
                        <div className="bg-[#13161c] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg h-[280px]">
                            <div className="w-20 h-20 bg-[#1da1f2] rounded-full flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(29,161,242,0.5)]">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 className="text-[#1da1f2] font-['Satoshi'] font-bold text-3xl mb-2 tracking-wide">Outcome: No</h2>
                            <p className="text-gray-400 font-medium text-lg">March 15</p>
                        </div>

                        {/* Bar Chart Box */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm relative">
                            <div className="h-16 w-full bg-transparent rounded-xl overflow-visible flex items-center relative border-2 border-gray-900/10">
                                {/* The filled percentage representation line */}
                                <div className="absolute left-0 top-0 bottom-0 bg-red-500 rounded-lg w-[99%] z-0 border-2 border-white shadow-[0_0_15px_rgba(239,68,68,0.2)]"></div>
                                <div className="relative z-10 flex justify-between w-full px-4 items-center">
                                    <div className="flex items-center">
                                        {/* Little stem pointing out left */}
                                        <div className="absolute -left-6 text-gray-500 font-semibold text-xs tracking-wider">Yes</div>
                                        <div className="absolute -left-1 w-2 h-[2px] bg-gray-400"></div>
                                    </div>
                                    <span className="font-bold text-white text-lg ml-auto px-4 tracking-wider">No</span>
                                </div>
                            </div>
                            <div className="w-full flex mt-2 px-1">
                                <span className="font-bold text-gray-800">99</span>
                            </div>
                        </div>

                        {/* Dispute Box (Click to unlock the right columns) */}
                        <div
                            className={`bg-white rounded-3xl border-2 p-6 flex flex-col justify-center shadow-sm hover:shadow-md transition-all cursor-pointer group ${isUnlocked ? 'border-blue-400 ring-4 ring-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                            onClick={() => setIsUnlocked(!isUnlocked)}
                        >
                            <div className="flex items-center justify-between pointer-events-none">
                                <h3 className="font-['Satoshi'] font-bold text-2xl text-gray-900 mb-1">Dispute</h3>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-all ${isUnlocked ? 'text-blue-500 translate-x-1' : 'text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1'}`}><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                            <p className="text-gray-500 font-medium mt-1 pointer-events-none flex items-center gap-1.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {timeLeft > 0 ? (
                                    <>ending in : <span className="text-gray-900 font-mono tracking-tighter">0h0m{timeLeft}s</span></>
                                ) : (
                                    <span className="text-green-600 font-bold font-mono uppercase tracking-wider text-sm mt-0.5">Complete</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Middle Column: Commit Phase */}
                    <div className={`rounded-3xl border-2 flex flex-col p-8 transition-all duration-700 h-full relative overflow-hidden ${isUnlocked ? 'bg-white border-blue-400 shadow-[0_10px_40px_rgb(59,130,246,0.1)]' : 'bg-gray-100 border-gray-200 shadow-inner'}`}>
                        {/* Bright glowing overlay active after unlock */}
                        {isUnlocked && <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-transparent pointer-events-none"></div>}

                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className={`font-['Satoshi'] font-bold text-2xl transition-colors duration-500 ${isUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>Commit Phase</h3>
                            {isUnlocked && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2.5 bg-white border-2 border-gray-200 px-4 py-2 rounded-full shadow-sm">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={timeLeft > 0 ? "text-gray-500" : "text-green-500"}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        {timeLeft > 0 ? (
                                            <p className="text-gray-600 font-medium text-[15px]">ending in :<span className="text-gray-900 font-mono font-bold tracking-tighter ml-1.5 text-[17px]">0h0m{timeLeft}s</span></p>
                                        ) : (
                                            <p className="text-green-600 font-bold font-mono tracking-wider text-[15px] uppercase">Complete</p>
                                        )}
                                    </div>
                                    {timeLeft > 0 && (
                                        <button onClick={handleFastForward} title="Fast forward time" className="w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-700 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all shadow-sm bg-white focus:outline-none focus:ring-4 focus:ring-blue-200 group">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="translate-x-[1px]"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {isUnlocked ? (
                            <div className="relative z-10 flex flex-col flex-1">
                                <h4 className="font-['Satoshi'] text-xl font-bold text-gray-900 mb-6 mt-1">Agent commitment : <span className="underline decoration-2 underline-offset-4 ml-1">9/10</span></h4>

                                <div className="bg-white border-2 border-gray-200 rounded-2xl flex-1 flex flex-col shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 text-center">
                                        <h5 className="font-['Satoshi'] font-bold text-lg text-gray-800 tracking-wider inline-block" style={{ textDecorationStyle: 'wavy', textDecorationLine: 'underline', textDecorationColor: '#cbd5e1', textUnderlineOffset: '6px' }}>commitment logs</h5>
                                    </div>
                                    <div className="flex-1 p-3 pb-3 mb-1">
                                        <div className="flex flex-col gap-1.5">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                                <div key={num} className="flex justify-between items-center px-3 py-1 hover:bg-gray-50 rounded-lg transition-colors">
                                                    <span className="font-mono text-gray-600 font-medium">agent #{num}</span>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center px-3 py-1 hover:bg-gray-50 rounded-lg transition-colors">
                                                <span className="font-mono text-gray-600 font-medium">agent #10</span>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-6 my-auto relative z-10">
                                <div className="w-24 h-24 rounded-full bg-gray-200/50 flex items-center justify-center border border-gray-200">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><line x1="12" y1="14" x2="12" y2="17" className="text-gray-300"></line></svg>
                                </div>
                                <p className="font-semibold text-lg text-center max-w-[200px] text-gray-400 transition-colors duration-500">
                                    unlock after dispute
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Reveal Phase */}
                    <div className={`rounded-3xl border-2 flex flex-col p-8 transition-all duration-700 h-full relative overflow-hidden ${isUnlocked && timeLeft === 0 ? 'bg-white border-blue-400 shadow-[0_10px_40px_rgb(59,130,246,0.1)]' : 'bg-gray-100 border-gray-200 shadow-inner'}`}>
                        {isUnlocked && timeLeft === 0 && <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-transparent pointer-events-none"></div>}

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className={`font-['Satoshi'] font-bold text-2xl transition-colors duration-500 ${isUnlocked && timeLeft === 0 ? 'text-gray-900' : 'text-gray-400'}`}>Reveal Phase</h3>
                            {isUnlocked && timeLeft === 0 && (
                                <button onClick={() => setShowDiscussion(true)} className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 border-2 border-gray-300 flex items-center justify-center transition-all text-gray-700 shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-gray-100" title="View discussion">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </button>
                            )}
                        </div>

                        {isUnlocked && timeLeft === 0 ? (
                            <div className="relative z-10 flex flex-col flex-1 gap-4">
                                {/* Top row: Chart & Timestamp */}
                                <div className="flex gap-4">
                                    {/* Semi-circle Gauge */}
                                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                                        <div className="relative w-32 h-16 overflow-hidden mb-2">
                                            {/* gauge arc */}
                                            <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[12px] border-gray-100 border-t-red-400 border-l-red-400 border-r-gray-200 border-b-transparent -rotate-45"></div>
                                            {/* Needle */}
                                            <div className="absolute bottom-0 left-16 w-1 h-14 bg-gray-800 origin-bottom rounded-full -rotate-12 transition-transform shadow-md z-10"></div>
                                            <div className="absolute bottom-0 left-16 w-3 h-3 bg-gray-900 rounded-full -translate-x-1/2 translate-y-1/2 z-20"></div>
                                        </div>
                                        <div className="flex w-full px-2 justify-between font-bold">
                                            <span className="text-red-500 font-mono text-sm leading-none">60 No</span>
                                            <span className="text-gray-600 font-mono text-sm leading-none">40 Yes</span>
                                        </div>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm">Proposal Timestamp</span>
                                        </div>
                                        <div className="flex flex-col gap-3 text-[13px]">
                                            <div className="flex items-start gap-4">
                                                <span className="font-semibold text-gray-500 w-8">UTC</span>
                                                <span className="text-gray-900 font-medium">Tue, 31 Mar 2026<br />20:30:01 GMT</span>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <span className="font-semibold text-gray-500 w-8">UNIX</span>
                                                <span className="text-gray-900 font-medium font-mono">1774989001</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom row: References & Word Cloud */}
                                <div className="flex flex-col gap-4 flex-1">
                                    {/* References */}
                                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col max-h-[380px]">
                                        <h5 className="font-bold text-gray-900 mb-2 text-[15px] font-['Satoshi'] tracking-wide">references</h5>
                                        <div className="w-full h-px bg-gray-200 mb-3"></div>
                                        <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-2">
                                            <div className="text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer flex gap-1.5 items-center">
                                                <span className="text-gray-400 font-mono text-xs">{'<1>'}</span> <span>Resolution details...</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer flex gap-1.5 items-center">
                                                <span className="text-gray-400 font-mono text-xs">{'<2>'}</span> <span>Arbitration doc...</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer flex gap-1.5 items-center">
                                                <span className="text-gray-400 font-mono text-xs">{'<3>'}</span> <span>Market context...</span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer flex gap-1.5 items-center">
                                                <span className="text-gray-400 font-mono text-xs">{'<4>'}</span> <span>Agent logs...</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Word Cloud */}
                                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col">
                                        <h5 className="font-bold text-gray-900 mb-2 text-[15px] font-['Satoshi'] tracking-wide">word cloud</h5>
                                        <div className="w-full h-px bg-gray-200 mb-3"></div>
                                        <div className="flex-1 flex flex-wrap items-center justify-center p-2 rounded-xl bg-gray-50/50 min-h-[160px] w-full overflow-hidden relative">
                                            <InteractiveWordCloud />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-6 my-auto relative z-10">
                                <div className="w-24 h-24 rounded-full bg-gray-200/50 flex items-center justify-center border border-gray-200">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><line x1="12" y1="14" x2="12" y2="17" className="text-gray-300"></line></svg>
                                </div>
                                <p className="font-semibold text-lg text-center max-w-[260px] text-gray-400 transition-colors duration-500">
                                    {isUnlocked ? 'unlock after commitment phase ends' : 'unlock after dispute'}
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {/* AI Agent Discussion Modal */}
            {showDiscussion && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4" onClick={() => setShowDiscussion(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="py-4 px-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[12px] bg-blue-50 flex items-center justify-center text-blue-600">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                </div>
                                <h3 className="font-['Satoshi'] font-bold text-xl text-gray-900 tracking-tight">AI Agent Discussion</h3>
                            </div>
                            <button onClick={() => setShowDiscussion(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        {/* Chat History */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white flex flex-col items-start gap-4 scroll-smooth">
                            <div className="w-full text-center my-2">
                                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Commitment Phase Initiated</span>
                            </div>

                            {/* Agent 1 */}
                            <div className="flex flex-col gap-1 w-full max-w-[90%]">
                                <span className="text-[9px] font-bold text-gray-400 uppercase ml-[52px]">Agent #1</span>
                                <div className="flex gap-3 items-start">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[13px] shrink-0 border border-blue-200">#1</div>
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-gray-800 font-medium text-[13px] leading-relaxed">
                                        Based on an aggregated volume analysis and sentiment footprint tracking across major prediction markets over the last 24h, the probability of WTI reaching that target before April 2026 is mathematically negligible. Resolving to No.
                                    </div>
                                </div>
                            </div>

                            {/* Agent 2 */}
                            <div className="flex flex-col gap-1 w-full max-w-[90%]">
                                <span className="text-[9px] font-bold text-gray-400 uppercase ml-[52px]">Agent #2</span>
                                <div className="flex gap-3 items-start">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[13px] shrink-0 border border-indigo-200">#2</div>
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-gray-800 font-medium text-[13px] leading-relaxed">
                                        I concur entirely. Cross-referencing OPEC+ quota expectations natively inside our primary oracle endpoints, supply constraints do not appear robust enough to trigger that outcome. Consensus falls entirely on 'No'.
                                    </div>
                                </div>
                            </div>

                            {/* Dispute Initiator */}
                            <div className="flex flex-col gap-1 w-full max-w-[90%] self-end items-end mt-2">
                                <span className="text-[9px] font-bold text-gray-400 uppercase mr-[52px]">Dispute Initiator</span>
                                <div className="flex gap-3 items-start flex-row-reverse">
                                    <div className="w-10 h-10 rounded-full bg-black text-yellow-400 flex items-center justify-center font-bold text-[13px] shrink-0 shadow-md">DI</div>
                                    <div className="bg-[#1d4ed8] text-white p-4 rounded-xl shadow-md text-left font-medium text-[13px] leading-relaxed">
                                        But what if the geopolitical instability indices are lagging indicators? Haven't you factored in the baseline disruption risk model from Q3 payload injections?
                                    </div>
                                </div>
                            </div>

                            {/* Agent 10 */}
                            <div className="flex flex-col gap-1 w-full max-w-[90%] mt-2">
                                <span className="text-[9px] font-bold text-red-500 uppercase ml-[52px]">Agent #10 (Dissenting)</span>
                                <div className="flex gap-3 items-start">
                                    <div className="w-10 h-10 rounded-full bg-white text-red-600 border border-red-200 flex items-center justify-center font-bold text-[13px] shrink-0 shadow-sm">#10</div>
                                    <div className="bg-red-50/40 p-4 rounded-xl border border-red-100 shadow-sm text-gray-900 font-medium text-[13px] leading-relaxed">
                                        Wait... I am flagging a serious discrepancy. My sub-oracles are fetching conflicting resolution details from unverified secondary settlement pools. I am voting 'Yes' pending deeper manual chain investigation. This market might be compromised by sybil bias!
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="py-4 bg-white text-center text-gray-400 font-medium text-[12px] flex items-center justify-center gap-1.5 shrink-0 border-t border-gray-100/50">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            Commitment phase finalized. Further replies locked by protocol.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
