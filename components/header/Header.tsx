import React from 'react';
import Link from 'next/link';

export default function Header() {
    return (
        <div className="w-full flex justify-center relative pt-4 z-[100] px-2 md:px-0 bg-transparent">
            <header
                className="w-[96%] max-w-[1800px] h-[60px] grid grid-cols-3 items-center pl-4 pr-2 lg:pl-8 lg:pr-3 rounded-full border border-black/80 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3),0_8px_32px_0_rgba(31,38,135,0.1),inset_0_2px_3px_rgba(255,255,255,0.9),inset_0_-1px_3px_rgba(0,0,0,0.05)] backdrop-blur-[24px]"
                style={{
                    backgroundImage: 'linear-gradient(110deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.3) 70%, rgba(255,255,255,0) 70%), linear-gradient(35deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.4) 20%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0) 60%), linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
                }}
            >
                {/* Left: Navigation Links */}
                <nav className="flex items-center gap-2 justify-start pl-2">
                    <Link href="/" className="font-[500] text-[17px] text-[#212529] hover:bg-gray-200/80 px-4 py-2 rounded-xl transition-all tracking-wide">
                        Home
                    </Link>
                    <Link href="/market" className="font-[500] text-[17px] text-[#212529] hover:bg-gray-200/80 px-4 py-2 rounded-xl transition-all tracking-wide">
                        Market
                    </Link>
                </nav>

                {/* Center: Logo */}
                <div className="flex items-center justify-center">
                    <span className="font-[700] text-[22px] tracking-[0.15em] text-[#212529]">DIVE</span>
                </div>

                {/* Right: CTA */}
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        className="bg-slate-700 text-white px-7 py-2.5 rounded-full font-[500] hover:bg-slate-800 transition-colors text-[17px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                    >
                        Get Started
                    </button>
                </div>
            </header>
        </div>
    );
}
