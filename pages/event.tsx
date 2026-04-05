import Head from 'next/head';
import React, { useState, useCallback } from 'react';
import Header from '../components/header/Header';
import { Roboto, Figtree } from "next/font/google";

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

interface ShareResult {
    success?: boolean;
    side?: string;
    amount?: number;
    token_id?: string;
    token_name?: string;
    mint_status?: string;
    transfer_tx?: string;
    pool?: { yes_token_id: string; no_token_id: string; total_yes: number; total_no: number; yes_percent: number; no_percent: number };
    explorer?: { token: string; yes_token: string; no_token: string };
    error?: string;
}

export default function Event() {
    const [activeTab, setActiveTab] = useState("Buy");
    const [selectedOutcome, setSelectedOutcome] = useState("up_200");
    const [orderSide, setOrderSide] = useState<"yes" | "no">("yes");
    const [shares, setShares] = useState("10");
    const [disputeStep, setDisputeStep] = useState(1);
    const [animating, setAnimating] = useState(false);
    const [buying, setBuying] = useState(false);
    const [lastResult, setLastResult] = useState<ShareResult | null>(null);
    const [txLog, setTxLog] = useState<ShareResult[]>([]);

    const MARKET_ID = "wti_crude_oil_apr26";

    const startDispute = useCallback(() => {
        setAnimating(true);
        setDisputeStep(2);
        let step = 2;
        const interval = setInterval(() => {
            step++;
            setDisputeStep(step);
            if (step >= 6) {
                clearInterval(interval);
                setAnimating(false);
            }
        }, 5000);
    }, []);

    const outcomes = [
        { key: "up_200", price: "up $200", vol: "$592,809", percent: "3%", yes: "2.6c", no: "97.6c", trend: null },
        { key: "up_170", price: "up $170", vol: "$177,331", percent: "4%", yes: "4.3c", no: "96.0c", trend: null },
        { key: "up_160", price: "up $160", vol: "$174,852", percent: "9%", yes: "9.3c", no: "91.0c", trend: null },
        { key: "up_150", price: "up $150", vol: "$603,599", percent: "17%", yes: "17c", no: "84c", trend: "down" as const },
        { key: "up_140", price: "up $140", vol: "$399,375", percent: "29%", yes: "29c", no: "72c", trend: "down" as const },
        { key: "up_130", price: "up $130", vol: "$430,370", percent: "48%", yes: "48c", no: "53c", trend: "down" as const },
        { key: "up_120", price: "up $120", vol: "$543,070", percent: "78%", yes: "78c", no: "23c", trend: "up" as const },
    ];

    const buyShare = async (side: "yes" | "no", outcomeKey?: string) => {
        setBuying(true);
        setLastResult(null);
        try {
            const marketId = `${MARKET_ID}_${outcomeKey || selectedOutcome}`;
            const resp = await fetch("/api/market/buy-share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    market_id: marketId,
                    side,
                    amount: shares,
                    outcome_label: outcomes.find(o => o.key === (outcomeKey || selectedOutcome))?.price || marketId,
                }),
            });
            const data: ShareResult = await resp.json();
            setLastResult(data);
            if (data.success) {
                setTxLog(prev => [data, ...prev].slice(0, 10));
            }
        } catch (err) {
            setLastResult({ error: err instanceof Error ? err.message : "Request failed" });
        }
        setBuying(false);
    };

    const selectedData = outcomes.find(o => o.key === selectedOutcome) || outcomes[0];

    return (
        <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
            <Head>
                <title>Event | Dive</title>
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
            </Head>

            <Header />

            <main className="w-[96%] max-w-[1800px] mx-auto mt-8 pb-16 grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Left Column: Event details & outcomes */}
                <div className="xl:col-span-3 flex flex-col gap-6">

                    {/* Header Section */}
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700">
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
                        <div className="hidden sm:flex items-center gap-3 text-gray-400">
                            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></button>
                            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path></svg></button>
                            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                        </div>
                    </div>

                    {/* Stats & Filters Row */}
                    <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-gray-200 pb-4">
                        <div className="flex items-center gap-2">
                            <button className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1 text-sm font-medium transition-colors">
                                Past <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            <button className="px-4 py-1.5 rounded-full bg-gray-800 text-white border border-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors">May 1</button>
                            <button className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors">Jun 30</button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium tracking-wide">
                            <span className="text-gray-700">$5,252,239 Vol.</span>
                            <span className="hidden md:inline">&middot;</span>
                            <span className="hidden md:flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg> May 1, 2026</span>
                        </div>
                    </div>

                    {/* Outcomes Header row */}
                    <div className="flex items-center justify-end px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest mt-2">
                        <span className="flex-1"></span>
                        <div className="w-24 text-center">Likelihood</div>
                        <div className="w-[180px] pl-4 text-left">Trade</div>
                    </div>

                    {/* Outcomes List */}
                    <div className="flex flex-col gap-2.5">
                        {outcomes.map((outcome) => (
                            <div
                                key={outcome.key}
                                className={`bg-white rounded-xl border p-4 flex items-center justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all cursor-pointer ${selectedOutcome === outcome.key ? 'border-gray-400 ring-1 ring-gray-200' : 'border-gray-200'}`}
                                onClick={() => setSelectedOutcome(outcome.key)}
                            >
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="font-semibold text-gray-900 text-lg md:text-xl font-['Satoshi'] leading-tight mb-1">{outcome.price}</div>
                                    <div className="text-gray-500 text-xs md:text-sm font-medium flex items-center gap-1.5">
                                        {outcome.vol} Vol. <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                                    </div>
                                </div>

                                <div className="w-24 flex items-center justify-center gap-1.5 text-center shrink-0">
                                    <span className="text-2xl md:text-3xl font-bold text-gray-900">{outcome.percent}</span>
                                    <div className="w-6 flex items-center justify-center">
                                        {outcome.trend === 'down' && <span className="text-red-500 text-xs font-bold leading-none translate-y-[2px]">&#9660;</span>}
                                        {outcome.trend === 'up' && <span className="text-green-500 text-xs font-bold leading-none translate-y-[2px]">&#9650;</span>}
                                    </div>
                                </div>

                                <div className="flex gap-2 w-[180px] shrink-0 ml-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); buyShare("yes", outcome.key); }}
                                        disabled={buying}
                                        className="flex-1 flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg py-2 transition-colors disabled:opacity-50"
                                    >
                                        <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">Buy Yes</span>
                                        <span className="text-sm font-bold mt-0.5">{outcome.yes}</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); buyShare("no", outcome.key); }}
                                        disabled={buying}
                                        className="flex-1 flex flex-col items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg py-2 transition-colors disabled:opacity-50"
                                    >
                                        <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">Buy No</span>
                                        <span className="text-sm font-bold mt-0.5">{outcome.no}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* HCS Transaction Log */}
                    {txLog.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="font-['Satoshi'] text-lg font-bold text-gray-900 mb-4">HTS Share Transactions</h3>
                            {txLog[0]?.pool && (
                                <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                                    <span className="text-gray-500">YES Token:</span>
                                    <a href={txLog[0].explorer?.yes_token} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-mono text-xs hover:underline">{txLog[0].pool.yes_token_id}</a>
                                    <span className="text-gray-500">NO Token:</span>
                                    <a href={txLog[0].explorer?.no_token} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-mono text-xs hover:underline">{txLog[0].pool.no_token_id}</a>
                                </div>
                            )}
                            <div className="space-y-3">
                                {txLog.map((tx, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${tx.side === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {tx.side}
                                        </span>
                                        <span className="text-gray-700 font-medium">{tx.amount} shares</span>
                                        <span className="text-gray-400 font-mono text-xs">{tx.token_id}</span>
                                        <span className="text-gray-400 text-xs">{tx.mint_status}</span>
                                        {tx.pool && (
                                            <span className="ml-auto text-gray-500 text-xs">
                                                Pool: <span className="text-green-600 font-bold">{tx.pool.total_yes} YES ({tx.pool.yes_percent}%)</span> / <span className="text-red-600 font-bold">{tx.pool.total_no} NO ({tx.pool.no_percent}%)</span>
                                            </span>
                                        )}
                                        {tx.explorer && (
                                            <a href={tx.explorer.token} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 text-xs underline ml-2">
                                                hashscan
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Trade Widget */}
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sticky top-8">

                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 22C7.58172 22 4 18.4183 4 14C4 9.58172 12 2 12 2C12 2 20 9.58172 20 14C20 18.4183 16.4183 22 12 22Z" /></svg>
                                </div>
                                <span className="font-bold font-['Satoshi'] text-gray-900 text-xl md:text-2xl">{selectedData.price}</span>
                            </div>
                        </div>

                        {/* Buy/Sell Tabs */}
                        <div className="flex items-center gap-6 border-b border-gray-200 mb-6 relative">
                            <button
                                onClick={() => setActiveTab("Buy")}
                                className={`font-bold text-base pb-3 -mb-[1px] border-b-2 transition-colors ${activeTab === 'Buy' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                            >Buy</button>
                            <button
                                onClick={() => setActiveTab("Sell")}
                                className={`font-bold text-base pb-3 -mb-[1px] border-b-2 transition-colors ${activeTab === 'Sell' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                            >Sell</button>

                            <div className="ml-auto flex items-center gap-1.5 text-sm font-medium text-gray-500 pb-3 cursor-pointer hover:text-gray-800 transition-colors">
                                Limit <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                            </div>
                        </div>

                        {/* Yes/No Selection */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => setOrderSide("yes")}
                                className={`flex-1 rounded-xl py-3 border-2 font-bold text-lg transition-all flex items-center justify-center gap-2 ${orderSide === 'yes' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                Yes <span className="text-sm font-semibold opacity-80">{selectedData.yes}</span>
                            </button>
                            <button
                                onClick={() => setOrderSide("no")}
                                className={`flex-1 rounded-xl py-3 border-2 font-bold text-lg transition-all flex items-center justify-center gap-2 ${orderSide === 'no' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                No <span className="text-sm font-semibold opacity-80">{selectedData.no}</span>
                            </button>
                        </div>

                        {/* Shares */}
                        <div className="flex flex-col gap-2 mb-6">
                            <div className="flex justify-between text-sm items-end">
                                <span className="font-semibold text-gray-700">Shares</span>
                            </div>
                            <div className="flex items-center rounded-xl border-2 border-gray-200 overflow-hidden focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-500 transition-all bg-white">
                                <input
                                    type="text"
                                    value={shares}
                                    onChange={(e) => setShares(e.target.value.replace(/[^0-9]/g, "") || "1")}
                                    className="flex-1 w-full text-right px-4 py-3 outline-none text-gray-900 font-mono text-xl font-semibold bg-transparent"
                                />
                            </div>
                            <div className="flex justify-end gap-1.5 mt-2">
                                {['1', '5', '10', '50', '100'].map(val => (
                                    <button key={val} onClick={() => setShares(val)} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono font-bold transition-colors">{val}</button>
                                ))}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700">Side</span>
                                <span className={`font-bold text-lg ${orderSide === 'yes' ? 'text-green-600' : 'text-red-600'}`}>{orderSide.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700">Shares</span>
                                <span className="font-bold text-gray-900 text-lg">{shares}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => buyShare(orderSide)}
                            disabled={buying}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border text-lg transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50 ${
                                orderSide === 'yes'
                                    ? 'bg-green-600 hover:bg-green-700 border-green-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 border-red-700 text-white'
                            }`}
                        >
                            {buying ? "Minting on HCS..." : `Buy ${orderSide.toUpperCase()} Shares`}
                        </button>

                        {/* Last HCS Result */}
                        {lastResult && (
                            <div className={`mt-4 p-4 rounded-xl border text-sm ${lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                {lastResult.success ? (
                                    <>
                                        <div className="font-bold text-green-800 mb-2">Minted via Hedera Token Service</div>
                                        <div className="space-y-1 text-green-700 text-xs font-mono">
                                            <div>token: {lastResult.token_id}</div>
                                            <div>name: {lastResult.token_name}</div>
                                            <div>amount: {lastResult.amount}</div>
                                            <div>status: {lastResult.mint_status}</div>
                                            {lastResult.pool && (
                                                <div className="mt-2 pt-2 border-t border-green-200">
                                                    pool: {lastResult.pool.total_yes} YES / {lastResult.pool.total_no} NO ({lastResult.pool.yes_percent}% / {lastResult.pool.no_percent}%)
                                                </div>
                                            )}
                                        </div>
                                        {lastResult.explorer && (
                                            <a href={lastResult.explorer.token} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-xs underline">
                                                View on HashScan
                                            </a>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-red-700">{lastResult.error}</div>
                                )}
                            </div>
                        )}

                        <p className="mt-5 text-center text-xs text-gray-500 font-medium">
                            Shares minted as HTS fungible tokens on Hedera testnet.
                        </p>
                    </div>
                </div>
            </main>

            {/* Dispute Resolution Tracker */}
            <section className="w-[96%] max-w-[1800px] mx-auto pb-16">
                <div className="bg-[#F0F2F5] rounded-2xl border border-gray-200 p-6 md:p-8">
                    <h2 className="font-['Satoshi'] text-xl md:text-2xl font-bold text-gray-900 mb-8">Resolution</h2>

                    {(() => {
                        const gavelIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 4.5L11 2l5 5-2.5 2.5"/><path d="M6 7l5 5"/><path d="M4 14l3.5-3.5 5 5L9 19"/><line x1="5" y1="21" x2="19" y2="21"/></svg>;
                        const chatIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;

                        const allSteps = [
                            { label: "Outcome proposed: Yes", sub: null, icon: null },
                            { label: "Dispute window", sub: "Bond: 750 USDC", icon: gavelIcon },
                            { label: "First round voting", sub: "Result: Unsure", icon: null },
                            { label: "Discussion", sub: "3 agents debated", icon: chatIcon },
                            { label: "Second round voting", sub: "Result: Yes", icon: null },
                            { label: "Final outcome", sub: null, icon: null },
                        ];

                        return (
                            <div className="flex items-start overflow-x-auto pb-4">
                                {allSteps.map((s, i, arr) => {
                                    const isDone = i < disputeStep;
                                    const isActive = i === disputeStep;

                                    return (
                                        <div key={i} className="flex items-start flex-1 min-w-[110px]">
                                            <div className="flex flex-col items-center w-full">
                                                <div className="flex items-center w-full">
                                                    <div className={`flex-1 h-[3px] transition-colors duration-700 ${
                                                        i === 0 ? 'bg-transparent' :
                                                        isDone || isActive ? 'bg-[#0066FF]' : 'bg-gray-200'
                                                    }`} />
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-700 ${
                                                        s.icon
                                                            ? isActive
                                                                ? 'bg-[#D8DBE0] text-gray-700 ring-[3px] ring-inset ring-[#0066FF]'
                                                                : 'bg-[#D8DBE0] text-gray-700'
                                                            : isDone
                                                                ? 'bg-[#0066FF] text-white'
                                                                : isActive
                                                                ? 'border-[3px] border-[#0066FF] bg-white text-[#0066FF]'
                                                                : 'border-[3px] border-gray-200 bg-white text-gray-300'
                                                    }`}>
                                                        {s.icon ? s.icon : isDone ? (
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                        ) : null}
                                                    </div>
                                                    <div className={`flex-1 h-[3px] transition-colors duration-700 ${
                                                        i === arr.length - 1 ? 'bg-transparent' :
                                                        isDone ? 'bg-[#0066FF]' : 'bg-gray-200'
                                                    }`} />
                                                </div>
                                                <div className="mt-3 text-center px-1">
                                                    <div className={`text-xs font-semibold transition-colors duration-700 ${
                                                        isDone ? 'text-gray-900' :
                                                        isActive ? 'text-[#0066FF]' :
                                                        'text-gray-400'
                                                    }`}>{s.label}</div>
                                                    {s.sub && isDone && (
                                                        <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
                                                    )}
                                                    {isActive && i === 1 && disputeStep === 1 && (
                                                        <div className="text-[11px] text-[#0066FF] font-semibold mt-0.5">1h 47m remaining</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {disputeStep === 1 && (
                        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span>Bond required:</span>
                                <span className="font-bold text-gray-900">750 USDC</span>
                            </div>
                            <button
                                onClick={startDispute}
                                className="px-8 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm transition-colors cursor-pointer active:scale-[0.98]"
                            >
                                Dispute &amp; Submit Bond
                            </button>
                        </div>
                    )}

                    {disputeStep >= 2 && (
                        <div className="mt-6 pt-5 border-t border-gray-100">
                            {disputeStep < 6 && (
                                <div className="flex items-start gap-3">
                                    <div className="w-4 h-4 mt-0.5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin shrink-0" />
                                    <div>
                                        <span className="text-sm text-[#0066FF] font-semibold">Processing dispute flow...</span>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {disputeStep === 2 && "Your bond of 750 USDC has been locked."}
                                            {disputeStep >= 3 && disputeStep < 6 && "Your bond cannot be taken back after the final result is determined."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {disputeStep >= 6 && !animating && (
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[#0066FF] flex items-center justify-center shrink-0">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">Market resolved: <span className="text-[#0066FF]">Yes</span></span>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                        <div className="text-sm font-bold text-red-700 mb-1">Bond slashed</div>
                                        <p className="text-sm text-red-600">The result didn&apos;t change from the original proposal. Your bond of <span className="font-bold">750 USDC</span> has been slashed.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
