import Head from 'next/head';
import React, { useState } from 'react';
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

export default function Event() {
    const [activeTab, setActiveTab] = useState("Buy");
    const [selectedOutcome, setSelectedOutcome] = useState("↑ $200");
    const [orderSide, setOrderSide] = useState<"Yes" | "No">("Yes");

    const outcomes = [
        { price: "↑ $200", vol: "$592,809", percent: "3%", yes: "2.6¢", no: "97.6¢", trend: null },
        { price: "↑ $170", vol: "$177,331", percent: "4%", yes: "4.3¢", no: "96.0¢", trend: null },
        { price: "↑ $160", vol: "$174,852", percent: "9%", yes: "9.3¢", no: "91.0¢", trend: null },
        { price: "↑ $150", vol: "$603,599", percent: "17%", yes: "17¢", no: "84¢", trend: "down" },
        { price: "↑ $140", vol: "$399,375", percent: "29%", yes: "29¢", no: "72¢", trend: "down" },
        { price: "↑ $130", vol: "$430,370", percent: "48%", yes: "48¢", no: "53¢", trend: "down" },
        { price: "↑ $120", vol: "$543,070", percent: "78%", yes: "78¢", no: "23¢", trend: "up" },
    ];

    return (
        <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
            <Head>
                <title>Event | Ethereum Explorer</title>
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
            </Head>

            <Header />

            <main className="w-[96%] max-w-[1800px] mx-auto mt-8 pb-16 grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Left Column: Event details & outcomes */}
                <div className="xl:col-span-3 flex flex-col gap-6">

                    {/* Header Section */}
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-500 flex items-center justify-center shrink-0 shadow-sm border border-slate-600">
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
                        {outcomes.map((outcome, idx) => (
                            <div
                                key={idx}
                                className={`bg-white rounded-xl border p-4 flex items-center justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all cursor-pointer ${selectedOutcome === outcome.price ? 'border-gray-400 ring-1 ring-gray-200' : 'border-gray-200'}`}
                                onClick={() => setSelectedOutcome(outcome.price)}
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
                                        {outcome.trend === 'down' && <span className="text-red-500 text-xs font-bold leading-none translate-y-[2px]">▼</span>}
                                        {outcome.trend === 'up' && <span className="text-green-500 text-xs font-bold leading-none translate-y-[2px]">▲</span>}
                                    </div>
                                </div>

                                <div className="flex gap-2 w-[180px] shrink-0 ml-4">
                                    <button className="flex-1 flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg py-2 transition-colors">
                                        <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">Buy Yes</span>
                                        <span className="text-sm font-bold mt-0.5">{outcome.yes}</span>
                                    </button>
                                    <button className="flex-1 flex flex-col items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg py-2 transition-colors">
                                        <span className="text-[11px] font-bold uppercase tracking-wide opacity-80">Buy No</span>
                                        <span className="text-sm font-bold mt-0.5">{outcome.no}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Trade Widget */}
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 sticky top-8">

                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center shrink-0 shadow-sm border border-slate-600">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 22C7.58172 22 4 18.4183 4 14C4 9.58172 12 2 12 2C12 2 20 9.58172 20 14C20 18.4183 16.4183 22 12 22Z" /></svg>
                                </div>
                                <span className="font-bold font-['Satoshi'] text-gray-900 text-xl md:text-2xl">{selectedOutcome}</span>
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
                                onClick={() => setOrderSide("Yes")}
                                className={`flex-1 rounded-xl py-3 border-2 font-bold text-lg transition-all flex items-center justify-center gap-2 ${orderSide === 'Yes' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                Yes <span className="text-sm font-semibold opacity-80">2.6¢</span>
                            </button>
                            <button
                                onClick={() => setOrderSide("No")}
                                className={`flex-1 rounded-xl py-3 border-2 font-bold text-lg transition-all flex items-center justify-center gap-2 ${orderSide === 'No' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                No <span className="text-sm font-semibold opacity-80">97.6¢</span>
                            </button>
                        </div>

                        {/* Limit Price */}
                        <div className="flex flex-col gap-2 mb-6">
                            <div className="flex justify-between text-sm items-end">
                                <span className="font-semibold text-gray-700">Limit Price</span>
                                <span className="text-gray-400 font-medium">Balance $0.00</span>
                            </div>
                            <div className="flex items-center rounded-xl border-2 border-gray-200 overflow-hidden focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-500 transition-all bg-white">
                                <button className="px-4 py-3 bg-gray-50 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors border-r border-gray-200 font-bold"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /></svg></button>
                                <input type="text" className="flex-1 w-full text-center py-3 outline-none text-gray-900 font-mono text-xl font-semibold bg-transparent" defaultValue="0.0¢" />
                                <button className="px-4 py-3 bg-gray-50 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors border-l border-gray-200 font-bold"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></button>
                            </div>
                        </div>

                        {/* Shares */}
                        <div className="flex flex-col gap-2 mb-6">
                            <div className="flex justify-between text-sm items-end">
                                <span className="font-semibold text-gray-700">Shares</span>
                                <span className="font-semibold text-blue-600 text-xs cursor-pointer hover:text-blue-800 uppercase tracking-wide">Max</span>
                            </div>
                            <div className="flex items-center rounded-xl border-2 border-gray-200 overflow-hidden focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-500 transition-all bg-white">
                                <input type="text" className="flex-1 w-full text-right px-4 py-3 outline-none text-gray-900 font-mono text-xl font-semibold bg-transparent" defaultValue="0" />
                            </div>
                            <div className="flex justify-end gap-1.5 mt-2">
                                {['-100', '-10', '+10', '+100', '+50'].map(val => (
                                    <button key={val} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-mono font-bold transition-colors">{val}</button>
                                ))}
                            </div>
                        </div>

                        {/* Set Expiration */}
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                            <span className="text-sm font-semibold text-gray-700">Set Expiration</span>
                            <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer hover:bg-gray-300 transition-colors">
                                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm"></div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700">Total</span>
                                <span className="font-bold text-gray-900 text-lg">$0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-700 flex items-center gap-1.5">To win <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg></span>
                                <span className="font-bold text-green-600 flex items-center gap-1.5 text-lg"><span className="text-sm">💵</span> $0</span>
                            </div>
                        </div>

                        <button className="w-full py-4 rounded-xl bg-gray-100 text-gray-400 font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-gray-200 text-lg transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg> Restricted region
                        </button>

                        <p className="mt-5 text-center text-xs text-gray-500 font-medium">
                            By trading, you agree to the <a href="#" className="underline hover:text-gray-800 transition-colors">Terms of Use</a>.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
