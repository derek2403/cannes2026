import Head from 'next/head';
import React, { useState } from 'react';
import Link from 'next/link';
import Header from '../components/header/Header';
import { Roboto, Figtree } from "next/font/google";
import type { GetServerSideProps } from 'next';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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

// Reuse typography principles from index.tsx
const typography = {
    heroTitle: "font-[family-name:var(--font-roboto)] font-[700] text-[#212529] text-[clamp(2.25rem,6vw,4rem)] leading-tight tracking-tight",
    heroSub: "font-[family-name:var(--font-roboto)] font-[400] text-[#6c757d] text-[clamp(1.125rem,2vw,1.5rem)]",
    sectionHeader: "font-['Satoshi',sans-serif] font-[700] text-[#212529] text-3xl lg:text-4xl",
    smallLabel: "font-[family-name:var(--font-roboto)] font-[700] text-[#6c757d] text-[0.75rem] uppercase tracking-wide",
    tokenAmount: "font-mono font-[500] text-[#212529] text-[clamp(0.9rem,1.5vw,1.1rem)] outline-none",
    bodyText: "font-[family-name:var(--font-roboto)] font-[400] text-[#212529] text-[clamp(0.875rem,1vw,1rem)]",
    statusBadge: "font-[family-name:var(--font-roboto)] font-[600] text-[#066a9c] bg-[#e7f1f8] border border-[#b8d4e7] text-[0.7rem] px-2 py-1 rounded-md",
};

const marketFilters = [
    "All", "Trump", "NCAA Basketball", "Iran", "Oil", "Hungary Election", "Cuba", "Daily Temperature", "Tweet Markets", "Strait of Hormuz"
];

// Helper components for the Market grid
// Yes/No Button Pair
const YesNoButtons = ({ yesPrice, noPrice, compact = false }: { yesPrice: number, noPrice: number, compact?: boolean }) => (
    <div className={`flex gap-1 ${compact ? 'w-24' : 'w-full'} shrink-0`}>
        <button className={`flex-1 flex justify-center items-center rounded-md font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors ${compact ? 'text-base py-1.5' : 'text-lg py-2.5'}`}>
            Yes
        </button>
        <button className={`flex-1 flex justify-center items-center rounded-md font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors ${compact ? 'text-base py-1.5' : 'text-lg py-2.5'}`}>
            No
        </button>
    </div>
);

// Green/Red Up/Down Pair
const UpDownButtons = ({ upPrice, downPrice }: { upPrice: number, downPrice: number }) => (
    <div className="flex gap-2 w-full mt-3">
        <button className="flex-1 flex justify-between items-center rounded-lg font-medium text-green-800 bg-green-100 hover:bg-green-200 px-3 py-2 transition-colors">
            <span>Up</span>
            <span className="text-base">+ ${upPrice}</span>
        </button>
        <button className="flex-1 flex justify-between items-center rounded-lg font-medium text-red-800 bg-red-100 hover:bg-red-200 px-3 py-2 transition-colors">
            <span>Down</span>
            <span className="text-base">+ ${downPrice}</span>
        </button>
    </div>
);

// Team selection Pair
const TeamButtons = ({ teamA, teamB }: { teamA: string, teamB: string }) => (
    <div className="flex gap-2 w-full mt-3">
        <button className="flex-1 rounded-lg font-medium text-orange-900 bg-orange-100 hover:bg-orange-200 px-3 py-2.5 text-lg transition-colors truncate">
            {teamA}
        </button>
        <button className="flex-1 rounded-lg font-medium text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-2.5 text-lg transition-colors truncate">
            {teamB}
        </button>
    </div>
);


interface AIMarket {
    id: string;
    created_at: string;
    ai_insight: {
        agent_id: string;
        confidence_score: number;
        suggested_categories: string[];
    };
    resolution: {
        question: string;
        resolution_date: string;
        resolution_criteria: string;
    };
    amm: {
        current_odds_yes: number;
    };
    ux: {
        status: string;
    };
    settlement: {
        winning_outcome: string | null;
    };
}

export const getServerSideProps: GetServerSideProps = async () => {
    const marketsFile = join(process.cwd(), 'data', 'markets.json');
    let aiMarkets: AIMarket[] = [];
    try {
        if (existsSync(marketsFile)) {
            aiMarkets = JSON.parse(readFileSync(marketsFile, 'utf-8'));
            aiMarkets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
    } catch { /* empty */ }
    return { props: { aiMarkets } };
};

const statusColors: Record<string, string> = {
    PROPOSED: 'text-blue-700 bg-blue-50 border-blue-200',
    RESOLVED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    DISPUTED: 'text-amber-700 bg-amber-50 border-amber-200',
};

const categoryIcons: Record<string, string> = {
    climate: '🌍',
    geopolitical: '🌐',
    cryptocurrency: '₿',
    space: '🚀',
    AI: '🤖',
};

function AIMarketCard({ market }: { market: AIMarket }) {
    const status = market.ux.status;
    const category = market.ai_insight.suggested_categories[0] || '';
    const icon = categoryIcons[category] || '📊';
    const yesPercent = Math.round(market.amm.current_odds_yes * 100);
    const isResolved = status === 'RESOLVED';
    const outcome = market.settlement.winning_outcome;

    return (
        <Link
            href={`/dispute?marketId=${market.id}`}
            className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group"
        >
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                    <span className="text-[18px]">{icon}</span>
                </div>
                <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                    {market.resolution.question}
                </h3>

            </div>

            <div className="flex flex-col gap-3 mt-auto">
                {isResolved && outcome ? (
                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 text-base font-medium">Outcome</span>
                        <span className={`font-bold text-lg ${outcome === 'YES' ? 'text-green-600' : 'text-red-600'}`}>
                            {outcome}
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 text-base font-medium">Yes</span>
                            <div className="flex items-center gap-4">
                                <span className="font-semibold text-gray-900 text-lg">{yesPercent}%</span>
                                <YesNoButtons yesPrice={0} noPrice={0} compact />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 text-base font-medium">No</span>
                            <div className="flex items-center gap-4">
                                <span className="font-semibold text-gray-900 text-lg">{100 - yesPercent}%</span>
                                <YesNoButtons yesPrice={0} noPrice={0} compact />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${statusColors[status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                        {status}
                    </span>
                    <span className="text-gray-400">{new Date(market.created_at).toLocaleDateString()}</span>
                </div>
                <span className="text-xs text-gray-400">by {market.ai_insight.agent_id}</span>
            </div>
        </Link>
    );
}

export default function Market({ aiMarkets = [] }: { aiMarkets: AIMarket[] }) {
    const [activeFilter, setActiveFilter] = useState("All");

    return (
        <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
            <Head>
                <title>Markets | Dive</title>
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
            </Head>

            {/* Reusing the Header exactly as index.tsx */}
            <Header />

            <main className="w-[96%] max-w-[1800px] mx-auto mt-6 pb-16">

                {/* Header Row: Title & Actions */}
                <div className="flex items-center justify-between mb-6 px-2">
                    <h1 className={typography.sectionHeader}>All markets</h1>
                    <div className="flex items-center gap-4 text-gray-500">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex overflow-x-auto gap-2 pb-4 mb-6 px-2 scrollbar-hide hide-scrollbar" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {marketFilters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-base font-medium transition-colors border ${activeFilter === filter
                                ? 'bg-gray-800 text-white border-gray-800 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Grid Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">

                    {/* AI Oracle Markets (dynamic from data/markets.json) */}
                    {aiMarkets.map((market) => (
                        <AIMarketCard key={market.id} market={market} />
                    ))}

                    {/* Card 1: WTI Crude Oil */}
                    <Link href="/event" className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 22C7.58172 22 4 18.4183 4 14C4 9.58172 12 2 12 2C12 2 20 9.58172 20 14C20 18.4183 16.4183 22 12 22Z" /></svg>
                            </div>
                            <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                                What will WTI Crude Oil (WTI) hit in April 2026?
                            </h3>
                        </div>
                        <div className="flex flex-col gap-4 mt-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">↑ $120</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">75%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">↑ $130</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">43%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <span className="font-medium">$5M Vol. ⇌</span>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </Link>

                    {/* Card 2: BTC 5 Minute Up or Down */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5 text-white">
                                    <span className="text-[18px]">₿</span>
                                </div>
                                <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                                    BTC 5 Minute Up or Down
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-green-500 border-l-gray-200 flex flex-col items-center justify-center text-sm font-bold text-green-600 shrink-0">
                                52%<span className="text-[11px] font-normal text-gray-500 leading-none">Up</span>
                            </div>
                        </div>
                        <div className="mt-auto">
                            <div className="flex justify-between text-sm font-medium text-green-600 px-1 mb-1">
                                <span>+ $43</span>
                                <span>+ $5</span>
                            </div>
                            <UpDownButtons upPrice={10} downPrice={15} />
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <div className="flex items-center gap-1.5 font-medium text-red-500">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                LIVE
                            </div>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card: Flyers vs Islanders */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex flex-col gap-4 mt-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-orange-500 text-white text-xs font-bold flex items-center justify-center">PHI</div>
                                    <span className="font-mono text-gray-500 text-base w-4">2</span>
                                    <span className="text-gray-900 font-semibold font-['Satoshi']">Flyers</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-lg">70%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center">NYI</div>
                                    <span className="font-mono text-gray-500 text-base w-4">0</span>
                                    <span className="text-gray-900 font-semibold font-['Satoshi']">Islanders</span>
                                </div>
                                <span className="font-semibold text-gray-700 text-lg">31%</span>
                            </div>
                        </div>
                        <div className="mt-6">
                            <TeamButtons teamA="Flyers" teamB="Islanders" />
                        </div>
                        <div className="mt-6 pt-3 border-t border-gray-100 flex items-center text-gray-400 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 flex-shrink-0 animate-pulse"></span>
                            <span className="font-medium mr-2 text-gray-700">P1 - 04:51</span>
                            <span>$2M Vol. &middot; NHL</span>
                            <div className="ml-auto flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card: Fed Decision */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                                <span className="text-[18px]">🏦</span>
                            </div>
                            <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                                Fed decision in April?
                            </h3>
                        </div>
                        <div className="flex flex-col gap-4 mt-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">No change</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">98%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">25 bps decrease</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">1%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <span className="font-medium">$48M Vol. ⇌</span>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card: Attorney General */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                                <span className="text-[18px]">🏛️</span>
                            </div>
                            <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                                Who will Trump announce as next Attorney General?
                            </h3>
                        </div>
                        <div className="flex flex-col gap-4 mt-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">Lee Zeldin</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">54%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">Ted Cruz</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">-</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <div className="flex items-center gap-1.5 font-medium text-yellow-600">
                                <span className="text-lg leading-none">✦</span>
                                NEW <span className="text-gray-400 ml-1">&middot; $97K Vol.</span>
                            </div>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card: Trump Admin Leaves */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                                <span className="text-[18px]">👔</span>
                            </div>
                            <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                                Who will leave Trump Administration before 2027?
                            </h3>
                        </div>
                        <div className="flex flex-col gap-4 mt-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">Kash Patel</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">76%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">Tulsi Gabbard</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">65%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <span className="font-medium">$782K Vol. ⇌</span>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: 2026 NCAA Tournament Winner */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                                <span className="text-[18px]">🏀</span>
                            </div>
                            <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                                2026 NCAA Tournament Winner
                            </h3>
                        </div>
                        <div className="flex flex-col gap-4 mt-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">Michigan</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">35%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">Arizona</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">32%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <span className="font-medium">$25M Vol.</span>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card 5: US x Iran ceasefire */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                                <span className="text-[18px]">🕊️</span>
                            </div>
                            <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors">
                                US x Iran ceasefire by...?
                            </h3>
                        </div>
                        <div className="flex flex-col gap-4 mt-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">December 31</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">69%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 text-base font-medium">June 30</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-gray-900 text-lg">50%</span>
                                    <YesNoButtons yesPrice={0} noPrice={0} compact />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <span className="font-medium">$87M Vol.</span>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card 6: Strait of Hormuz */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shrink-0 shadow-sm border border-slate-700 mt-0.5">
                                    <span className="text-[18px]">🚢</span>
                                </div>
                                <h3 className="font-['Satoshi'] font-semibold text-gray-900 text-lg md:text-xl leading-tight group-hover:text-blue-600 transition-colors pr-2">
                                    Strait of Hormuz traffic returns to normal by end of April?
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-l-blue-500 flex flex-col items-center justify-center text-sm font-bold text-gray-700 shrink-0">
                                10%<span className="text-xs font-normal text-gray-400 uppercase leading-none">chance</span>
                            </div>
                        </div>
                        <div className="mt-auto pt-4">
                            <YesNoButtons yesPrice={0} noPrice={0} compact={false} />
                        </div>
                        <div className="mt-8 pt-3 border-t border-gray-100 flex items-center justify-between text-gray-400 text-sm">
                            <span className="font-medium">$2M Vol. ⇌</span>
                            <div className="flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card 7: Timberwolves vs 76ers */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex flex-col gap-4 mt-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-blue-500 text-white text-xs font-bold flex items-center justify-center">MIN</div>
                                    <span className="font-mono text-gray-500 text-base w-4">17</span>
                                    <span className="text-gray-900 font-semibold font-['Satoshi']">Timberwolves</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-lg">30%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-blue-700 text-white text-xs font-bold flex items-center justify-center">PHI</div>
                                    <span className="font-mono text-gray-500 text-base w-4">19</span>
                                    <span className="text-gray-900 font-semibold font-['Satoshi']">76ers</span>
                                </div>
                                <span className="font-semibold text-gray-700 text-lg">71%</span>
                            </div>
                        </div>
                        <div className="mt-6">
                            <TeamButtons teamA="Timberwolves" teamB="76ers" />
                        </div>
                        <div className="mt-6 pt-3 border-t border-gray-100 flex items-center text-gray-400 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 flex-shrink-0 animate-pulse"></span>
                            <span className="font-medium mr-2 text-gray-700">Q1 - 00:57</span>
                            <span>$3M Vol. &middot; NBA</span>
                            <div className="ml-auto flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                    {/* Card 8: Pacers vs Hornets */}
                    <div className="bg-white rounded-xl shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col transition-shadow duration-300 cursor-pointer group">
                        <div className="flex flex-col gap-4 mt-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-yellow-500 text-white text-xs font-bold flex items-center justify-center">IND</div>
                                    <span className="font-mono text-gray-500 text-base w-4">16</span>
                                    <span className="text-gray-900 font-semibold font-['Satoshi']">Pacers</span>
                                </div>
                                <span className="font-semibold text-gray-900 text-lg">1%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-teal-500 text-white text-xs font-bold flex items-center justify-center">CHA</div>
                                    <span className="font-mono text-gray-500 text-base w-4">35</span>
                                    <span className="text-gray-900 font-semibold font-['Satoshi']">Hornets</span>
                                </div>
                                <span className="font-semibold text-gray-700 text-lg">99%</span>
                            </div>
                        </div>
                        <div className="mt-6">
                            <TeamButtons teamA="Pacers" teamB="Hornets" />
                        </div>
                        <div className="mt-6 pt-3 border-t border-gray-100 flex items-center text-gray-400 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 flex-shrink-0 animate-pulse"></span>
                            <span className="font-medium mr-2 text-gray-700">Q1 - 01:48</span>
                            <span>$2M Vol. &middot; NBA</span>
                            <div className="ml-auto flex gap-2">
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg></button>
                                <button className="hover:text-gray-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg></button>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
