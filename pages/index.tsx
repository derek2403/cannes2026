import Head from 'next/head';
import Image from 'next/image';
import { Roboto, Figtree } from "next/font/google";
import Header from '../components/header/Header';
import dynamic from 'next/dynamic';

const Plasma = dynamic(() => import('../components/content/Plasma'), { ssr: false });

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

const typography = {
  heroTitle: "font-[family-name:var(--font-roboto)] font-[700] text-[#212529] text-[clamp(2.25rem,6vw,4rem)] leading-tight tracking-tight",
  heroSub: "font-[family-name:var(--font-roboto)] font-[400] text-[#6c757d] text-[clamp(1.125rem,2vw,1.5rem)]",
  sectionHeader: "font-[family-name:var(--font-roboto)] font-[500] text-[#212529] text-[clamp(1.25rem,3vw,1.75rem)] pb-2",
  smallLabel: "font-[family-name:var(--font-roboto)] font-[700] text-[#6c757d] text-[0.75rem] uppercase tracking-wide",
  tokenAmount: "font-mono font-[500] text-[#212529] text-[clamp(0.9rem,1.5vw,1.1rem)] outline-none",
  walletHash: "font-mono font-[400] text-[#066a9c] text-[clamp(0.8rem,1.2vw,0.9rem)] hover:text-[#0a58ca] hover:underline cursor-pointer transition-colors break-all",
  apr: "font-mono font-[700] text-[#28a745] text-[clamp(1.25rem,4vw,2.5rem)]",
  bodyText: "font-[family-name:var(--font-roboto)] font-[400] text-[#212529] text-[clamp(0.875rem,1vw,1rem)]",
  buttonText: "font-[family-name:var(--font-roboto)] font-[500] text-[#FFFFFF] text-[0.875rem]",
  statusBadge: "font-[family-name:var(--font-roboto)] font-[600] text-[#066a9c] bg-[#e7f1f8] border border-[#b8d4e7] text-[0.7rem] px-2 py-1 rounded-md",
};

export default function ExplorerHome() {
  return (
    <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} font-[family-name:var(--font-roboto)]`}>
      <Head>
        <title>Ethereum (ETH) Blockchain Explorer</title>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
      </Head>

      {/* Header component */}
      <Header />

      {/* Hero Section */}
      <section className="w-[96%] max-w-[1800px] mx-auto mt-6 mb-10 pb-8">
        <div className="bg-[#111623] rounded-[1.5rem] relative overflow-hidden py-24 sm:py-32 px-6 lg:px-16 shadow-2xl">
          <div className="absolute inset-0 z-0 opacity-70">
            <Plasma
              color="#ffffff"
              speed={0.6}
              direction="forward"
              scale={2.6}
              opacity={0.5}
              mouseInteractive={true}
            />
          </div>
          <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-[900px] mx-auto py-8">
            <h1 className="font-['Satoshi',sans-serif] text-[44px] md:text-[56px] font-medium tracking-tight text-white mb-4 drop-shadow-md">
              The Ethereum Blockchain Explorer
            </h1>
            <p className={`text-[20px] font-normal text-white/70 mb-10 max-w-[600px] mx-auto ${figtree.variable} font-[family-name:var(--font-figtree)]`}>
              Discover blocks, transactions, tokens, and more.
            </p>

            <div className="flex w-full bg-white/70 backdrop-blur-xl bg-gradient-to-br from-white/90 to-white/50 rounded-full overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] border border-white/60 transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.3)] hover:border-[#066a9c]/60 p-2">
              <input
                type="text"
                placeholder="Search by Address / Txn Hash / Block / Token"
                className="flex-1 pl-8 pr-6 py-4 outline-none text-[#212529] placeholder-gray-400 min-w-0 font-sans text-[17px] bg-transparent"
              />
              <button className="bg-gray-400 hover:bg-gray-500 text-white px-10 py-3 rounded-full transition-colors flex items-center justify-center shadow-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="w-[96%] max-w-[1800px] mx-auto mt-[-80px] relative z-20 pb-16">

        {/* Global Stats Card */}
        <div className="bg-white rounded-xl shadow-[0_0.5rem_1rem_rgba(0,0,0,0.08)] border border-gray-200 mb-8 p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">

          {/* Stat 1 */}
          <div className="p-6 flex flex-col justify-center bg-gradient-to-br from-white to-gray-50/50">
            <h2 className={`${typography.smallLabel} mb-3 flex items-center gap-2`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
              </svg>
              Ether Price
            </h2>
            <div className="flex items-end gap-2 mb-1">
              <span className={typography.tokenAmount}>$2,052.72</span>
              <span className={`${typography.bodyText} text-gray-500`}>@ 0.030703 BTC</span>
              <span className={`${typography.bodyText} text-red-500 ml-1 font-medium`}>(-0.75%)</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h2 className={`${typography.smallLabel} mb-1 flex items-center gap-2`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>
                Market Cap
              </h2>
              <span className={typography.tokenAmount}>$247,744,853,497.00</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="p-6 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h2 className={`${typography.smallLabel} mb-3 flex items-center gap-2`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
                  Transactions
                </h2>
                <div className="flex items-end gap-2">
                  <span className={typography.tokenAmount}>3,370.87 M</span>
                  <span className={`${typography.bodyText} text-gray-500`}>(30.5 TPS)</span>
                </div>
              </div>
              <div className="text-right">
                <h2 className={`${typography.smallLabel} mb-3 flex justify-end items-center gap-2`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
                  Med Gas Price
                </h2>
                <div className="flex flex-col items-end gap-1">
                  <span className={typography.tokenAmount}>0.097 Gwei</span>
                  <span className={`${typography.bodyText} text-gray-500`}>(&lt; $0.01)</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
              <div>
                <h2 className={`${typography.smallLabel} mb-1 flex items-center gap-2`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                  Last Finalized Block
                </h2>
                <span className={typography.tokenAmount}>24801323</span>
              </div>
              <div className="text-right">
                <h2 className={`${typography.smallLabel} mb-1 flex justify-end items-center gap-2`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Last Safe Block
                </h2>
                <span className={typography.tokenAmount}>24801355</span>
              </div>
            </div>
          </div>

          {/* Stat 3 (Graph mock) */}
          <div className="p-6 flex flex-col justify-center lg:col-span-1 md:col-span-2 hidden lg:flex bg-gray-50/30">
            <h2 className={`${typography.smallLabel} mb-4 uppercase`}>TRANSACTION HISTORY IN 14 DAYS</h2>
            <div className="flex-1 w-full flex items-center justify-center min-h-[100px] relative">
              {/* Decorative chart SVG */}
              <svg className="w-full h-full text-gray-300 drop-shadow-sm" preserveAspectRatio="none" viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,50 Q40,30 80,60 T160,40 T240,70 T320,30 T400,45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium tracking-wide">
              <span>Mar 19</span>
              <span>Mar 26</span>
              <span>Apr 2</span>
            </div>
          </div>
        </div>

        {/* Two Columns List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Latest Blocks */}
          <div className="bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/40">
              <h2 className={typography.sectionHeader}>Latest Blocks</h2>
              <button className="flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Customize
              </button>
            </div>
            <div className="flex flex-col flex-1 divide-y divide-gray-100">

              {/* Block Item 1 */}
              <div className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="hidden sm:flex w-12 h-12 bg-gray-100 rounded-lg items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <a className={typography.walletHash}>24801405</a>
                  </div>
                  <span className={`${typography.bodyText} text-gray-500 text-sm`}>14 secs ago</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <span className={typography.bodyText}>Fee Recipient <a className={typography.walletHash}>Titan Builder</a></span>
                  </div>
                  <span className={`${typography.bodyText} text-gray-600`}><a className={typography.walletHash}>507 txns</a> in 12 secs</span>
                </div>
                <div className="flex items-center justify-center sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className={`${typography.statusBadge} inline-block shadow-sm`}>0.00768 Eth</span>
                </div>
              </div>

              {/* Block Item 2 */}
              <div className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="hidden sm:flex w-12 h-12 bg-gray-100 rounded-lg items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <a className={typography.walletHash}>24801404</a>
                  </div>
                  <span className={`${typography.bodyText} text-gray-500 text-sm`}>26 secs ago</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <span className={typography.bodyText}>Fee Recipient <a className={typography.walletHash}>Titan Builder</a></span>
                  </div>
                  <span className={`${typography.bodyText} text-gray-600`}><a className={typography.walletHash}>522 txns</a> in 12 secs</span>
                </div>
                <div className="flex items-center justify-center sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className={`${typography.statusBadge} inline-block shadow-sm`}>0.0071 Eth</span>
                </div>
              </div>

              {/* Block Item 3 */}
              <div className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="hidden sm:flex w-12 h-12 bg-gray-100 rounded-lg items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <a className={typography.walletHash}>24801403</a>
                  </div>
                  <span className={`${typography.bodyText} text-gray-500 text-sm`}>38 secs ago</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <span className={typography.bodyText}>Fee Recipient <a className={typography.walletHash}>rsync-builder</a></span>
                  </div>
                  <span className={`${typography.bodyText} text-gray-600`}><a className={typography.walletHash}>480 txns</a> in 12 secs</span>
                </div>
                <div className="flex items-center justify-center sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className={`${typography.statusBadge} inline-block shadow-sm`}>0.012 Eth</span>
                </div>
              </div>


            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50/40 mt-auto">
              <button className={`${typography.bodyText} w-full py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors uppercase font-medium rounded-md tracking-wide text-xs`}>
                View All Blocks →
              </button>
            </div>
          </div>

          {/* Latest Transactions */}
          <div className="bg-white rounded-xl shadow-[0_0.25rem_0.75rem_rgba(0,0,0,0.06)] border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/40">
              <h2 className={typography.sectionHeader}>Latest Transactions</h2>
              <button className="flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Customize
              </button>
            </div>
            <div className="flex flex-col flex-1 divide-y divide-gray-100">

              {/* Tx Item 1 */}
              <div className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="hidden sm:flex w-12 h-12 bg-gray-100 rounded-full items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <a className={typography.walletHash}>0x8992fe9f3cc...</a>
                  </div>
                  <span className={`${typography.bodyText} text-gray-500 text-sm`}>14 secs ago</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <span className={typography.bodyText}>From <a className={typography.walletHash}>Titan Builder</a></span>
                  </div>
                  <span className={`${typography.bodyText} text-gray-600 flex flex-wrap justify-center sm:justify-start gap-1`}>To <a className={typography.walletHash}>0xbc0b...</a></span>
                </div>
                <div className="flex items-center justify-center sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className={`${typography.statusBadge} inline-block bg-transparent text-gray-700 shadow-sm border-gray-200`}>0.00674 Eth</span>
                </div>
              </div>

              {/* Tx Item 2 */}
              <div className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="hidden sm:flex w-12 h-12 bg-gray-100 rounded-full items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <a className={typography.walletHash}>0x304cfeb4560...</a>
                  </div>
                  <span className={`${typography.bodyText} text-gray-500 text-sm`}>14 secs ago</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <span className={typography.bodyText}>From <a className={typography.walletHash}>0x13204d4b...71A3b6047</a></span>
                  </div>
                  <span className={`${typography.bodyText} text-gray-600 flex flex-wrap justify-center sm:justify-start gap-1`}>To <a className={typography.walletHash}>Wrapped Ether</a></span>
                </div>
                <div className="flex items-center justify-center sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className={`${typography.statusBadge} inline-block bg-transparent text-gray-700 shadow-sm border-gray-200`}>0 Eth</span>
                </div>
              </div>


              {/* Tx Item 3 */}
              <div className="p-4 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="hidden sm:flex w-12 h-12 bg-gray-100 rounded-full items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <a className={typography.walletHash}>0x092afef4511...</a>
                  </div>
                  <span className={`${typography.bodyText} text-gray-500 text-sm`}>14 secs ago</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0 w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <span className={typography.bodyText}>From <a className={typography.walletHash}>0x88334b...47A3</a></span>
                  </div>
                  <span className={`${typography.bodyText} text-gray-600 flex flex-wrap justify-center sm:justify-start gap-1`}>To <a className={typography.walletHash}>0xContract</a></span>
                </div>
                <div className="flex items-center justify-center sm:justify-end shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <span className={`${typography.statusBadge} inline-block bg-transparent text-gray-700 shadow-sm border-gray-200`}>0 Eth</span>
                </div>
              </div>


            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50/40 mt-auto">
              <button className={`${typography.bodyText} w-full py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors uppercase font-medium rounded-md tracking-wide text-xs`}>
                View All Transactions →
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* Footer mock */}
      <footer className="bg-gray-100 border-t border-gray-200 py-10 mt-10">
        <div className="w-[96%] max-w-[1800px] mx-auto text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Etherscan Clone Template built with Next.js and Tailwind.<br />
          Based on the specifications provided.
        </div>
      </footer>
    </div>
  );
}
