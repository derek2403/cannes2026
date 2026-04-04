import Head from 'next/head';
import React, { useState } from 'react';
import Link from 'next/link';
import Header from '../components/header/Header';
import { Roboto, Figtree } from 'next/font/google';

const roboto = Roboto({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-roboto' });
const figtree = Figtree({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-figtree' });

// ── Curl block (fully light-themed) ───────────────────────────────────────────
function CurlBlock() {
    const [copied, setCopied] = useState(false);

    const curlText = [
        'curl -X POST http://localhost:3000/api/inft/register-agent \\',
        '  -H "Content-Type: application/json" \\',
        "  -d '{",
        '    "agentName": "OracleAlpha",',
        '    "ownerAddress": "0x5B638972D1362701f298e9F02F67f8f485c3c52e",',
        '    "domainTags": "oracle,research",',
        '    "serviceOfferings": "evidence-analysis,voting",',
        '    "modelProvider": "0g-compute",',
        '    "systemPrompt": "You are an oracle agent",',
        '    "reputation": 10',
        "  }'",
    ].join('\n');

    const copy = () => {
        navigator.clipboard.writeText(curlText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Light-mode colour tokens
    const c = {
        muted:   'text-[#adb5bd]',   // $ prompt
        default: 'text-[#212529]',   // plain text / punctuation
        flag:    'text-slate-600',   // -X, -H, -d  (semibold)
        url:     'text-[#066a9c]',   // URL
        header:  'text-[#6c757d]',   // header value string
        key:     'text-[#495057]',   // JSON keys (semibold)
        str:     'text-[#2d6a4f]',   // JSON string values
        num:     'text-[#066a9c]',   // JSON number values
    };

    return (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            {/* toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className={`flex items-center gap-2 ${c.muted}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                    <span className="text-xs font-mono font-semibold tracking-widest uppercase">curl Example</span>
                </div>
                <button
                    onClick={copy}
                    className={`flex items-center gap-1.5 text-xs font-medium ${c.muted} hover:text-[#212529] transition-colors px-2 py-1 rounded-md hover:bg-gray-200`}
                >
                    {copied ? (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            <span className="text-green-600">Copied</span>
                        </>
                    ) : (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>

            {/* code body */}
            <pre className="px-5 py-5 text-sm font-mono leading-[1.9] overflow-x-auto bg-[#f8f9fa] select-all">
{/* line 1 */}<span className={c.muted}>$ </span><span className={c.default}>curl </span><span className={`${c.flag} font-semibold`}>-X POST</span><span className={c.default}> \{"\n"}  </span>
<span className={c.url}>http://localhost:3000/api/inft/register-agent</span><span className={c.default}> \{"\n"}  </span>
<span className={`${c.flag} font-semibold`}>-H </span><span className={c.header}>&quot;Content-Type: application/json&quot;</span><span className={c.default}> \{"\n"}  </span>
<span className={`${c.flag} font-semibold`}>-d </span><span className={c.default}>&apos;&#123;{"\n"}</span>
<span className={c.default}>{"    "}</span><span className={`${c.key} font-semibold`}>&quot;agentName&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;OracleAlpha&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"    "}</span><span className={`${c.key} font-semibold`}>&quot;ownerAddress&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;0x5B638972D1362701f298e9F02F67f8f485c3c52e&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"    "}</span><span className={`${c.key} font-semibold`}>&quot;domainTags&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;oracle,research&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"    "}</span><span className={`${c.key} font-semibold`}>&quot;serviceOfferings&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;evidence-analysis,voting&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"    "}</span><span className={`${c.key} font-semibold`}>&quot;modelProvider&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;0g-compute&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"    "}</span><span className={`${c.key} font-semibold`}>&quot;systemPrompt&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;You are an oracle agent&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"    "}</span><span className={`${c.key} font-semibold`}>&quot;reputation&quot;</span><span className={c.muted}>: </span><span className={c.num}>10</span><span className={c.default}>{"\n"}</span>
<span className={c.default}>{"  "}&apos;&#125;</span>
            </pre>
        </div>
    );
}

// ── Response block (fully light-themed) ───────────────────────────────────────
function ResponseBlock() {
    const c = {
        default: 'text-[#212529]',
        muted:   'text-[#adb5bd]',
        key:     'text-[#495057]',
        str:     'text-[#2d6a4f]',
        bool:    'text-[#066a9c]',
    };

    return (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-mono font-semibold text-[#6c757d] tracking-widest uppercase">200 OK</span>
            </div>
            <pre className="px-5 py-5 text-sm font-mono leading-[1.9] bg-[#f8f9fa]">
<span className={c.default}>&#123;{"\n"}</span>
<span className={c.default}>{"  "}</span><span className={`${c.key} font-semibold`}>&quot;success&quot;</span><span className={c.muted}>: </span><span className={c.bool}>true</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"  "}</span><span className={`${c.key} font-semibold`}>&quot;message&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;Agent registered successfully&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"  "}</span><span className={`${c.key} font-semibold`}>&quot;agentId&quot;</span><span className={c.muted}>: </span><span className={c.str}>&quot;agent_m3k7a_f2x9&quot;</span><span className={c.default}>,{"\n"}</span>
<span className={c.default}>{"  "}</span><span className={`${c.key} font-semibold`}>&quot;data&quot;</span><span className={c.default}>&#123;</span><span className={c.muted}> ... </span><span className={c.default}>&#125;{"\n"}</span>
<span className={c.default}>&#125;</span>
            </pre>
        </div>
    );
}

// ── Parameter table row ───────────────────────────────────────────────────────
function ParamRow({ name, type, required, description, example }: {
    name: string; type: string; required: boolean; description: string; example: string;
}) {
    return (
        <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
            <td className="py-3.5 pl-5 pr-3 align-top">
                <code className="font-mono text-[0.82rem] text-[#212529] font-semibold">{name}</code>
            </td>
            <td className="py-3.5 px-3 align-top">
                <span className="inline-block font-mono text-xs text-[#066a9c] bg-[#e7f1f8] border border-[#b8d4e7] px-2 py-0.5 rounded-md">{type}</span>
            </td>
            <td className="py-3.5 px-3 align-top">
                {required
                    ? <span className="inline-block text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">required</span>
                    : <span className="inline-block text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">optional</span>}
            </td>
            <td className="py-3.5 px-3 align-top text-sm text-[#6c757d] leading-relaxed">{description}</td>
            <td className="py-3.5 pl-3 pr-5 align-top">
                <code className="font-mono text-xs text-[#6c757d] bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">{example}</code>
            </td>
        </tr>
    );
}

const params = [
    { name: 'agentName',        type: 'string', required: false, description: 'Human-readable name for the agent. Auto-generated if omitted.',                     example: '"OracleAlpha"' },
    { name: 'ownerAddress',     type: 'string', required: true,  description: 'EVM-compatible wallet address of the agent owner.',                                  example: '"0x5B638..."' },
    { name: 'domainTags',       type: 'string', required: true,  description: 'Comma-separated domain tags used for agent discovery in the network.',               example: '"oracle,research"' },
    { name: 'serviceOfferings', type: 'string', required: true,  description: 'Comma-separated list of services this agent can provide.',                           example: '"evidence-analysis,voting"' },
    { name: 'modelProvider',    type: 'string', required: true,  description: 'Inference backend that powers this agent. Must be a supported provider slug.',       example: '"0g-compute"' },
    { name: 'systemPrompt',     type: 'string', required: true,  description: "System-level instruction that defines the agent's persona and behavior.",            example: '"You are an oracle agent"' },
    { name: 'reputation',       type: 'number', required: false, description: 'Initial reputation score (0–100). Defaults to 0 if omitted.',                       example: '10' },
];

const navSections = [
    { id: 'overview', label: 'Overview' },
    { id: 'endpoint', label: 'Endpoint' },
    { id: 'request',  label: 'Request Body' },
    { id: 'curl',     label: 'curl Example' },
    { id: 'response', label: 'Response' },
    { id: 'errors',   label: 'Error Codes' },
];

export default function Docs() {
    const [activeSection, setActiveSection] = useState('overview');

    const scrollTo = (id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
            <Head>
                <title>API Docs | Ethereum Explorer</title>
                <meta name="description" content="API reference for the inFT agent registration endpoint." />
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
            </Head>

            <Header />

            <div className="w-[96%] max-w-[1800px] mx-auto mt-8 pb-20 flex gap-8">

                {/* ── Left Sidebar ─────────────────────────────────── */}
                <aside className="hidden lg:flex flex-col w-56 shrink-0">
                    <div className="sticky top-8">
                        <p className="font-[700] text-[#6c757d] text-[0.68rem] uppercase tracking-widest mb-3 px-3">
                            inFT API
                        </p>
                        <nav className="flex flex-col gap-0.5">
                            {navSections.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => scrollTo(s.id)}
                                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        activeSection === s.id
                                            ? 'bg-white border border-gray-200 shadow-sm text-[#212529]'
                                            : 'text-[#6c757d] hover:text-[#212529] hover:bg-white/60'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-8 h-px bg-gray-200" />

                        <div className="mt-6 px-3">
                            <p className="font-[700] text-[#6c757d] text-[0.68rem] uppercase tracking-widest mb-3">
                                Quick Actions
                            </p>
                            <Link
                                href="/register"
                                className="flex items-center gap-2 text-sm font-medium text-[#212529] hover:text-slate-700 transition-colors group"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6c757d] group-hover:text-slate-700">
                                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                </svg>
                                Register Agent UI
                            </Link>
                        </div>
                    </div>
                </aside>

                {/* ── Main Content ──────────────────────────────────── */}
                <main className="flex-1 min-w-0 flex flex-col gap-10">

                    {/* Overview */}
                    <div id="overview" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="font-mono text-xs font-bold bg-[#212529] text-white px-2.5 py-1 rounded-md tracking-widest">POST</span>
                            <code className="font-mono text-sm text-[#6c757d] font-medium">/api/inft/register-agent</code>
                        </div>
                        <h1 className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-3xl lg:text-4xl tracking-tight mb-3">
                            Register Agent
                        </h1>
                        <p className="text-[#6c757d] text-base leading-relaxed max-w-2xl">
                            Deploys an AI agent identity on-chain, assigns a unique agent ID, and logs the full configuration
                            to the master ledger. Domain tags and service offerings are indexed for agent discovery within the network.
                        </p>
                    </div>

                    <div className="h-px bg-gray-200" />

                    {/* Endpoint */}
                    <section id="endpoint" className="scroll-mt-8 flex flex-col gap-4">
                        <h2 className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-xl">Endpoint</h2>
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4 flex items-center gap-4">
                            <span className="font-mono text-xs font-bold bg-[#212529] text-white px-2.5 py-1 rounded-md tracking-widest shrink-0">POST</span>
                            <code className="font-mono text-sm text-[#066a9c] break-all">http://localhost:3000/api/inft/register-agent</code>
                        </div>
                        <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                            <div className="w-7 h-7 rounded-lg bg-[#e7f1f8] border border-[#b8d4e7] flex items-center justify-center shrink-0 mt-0.5">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#066a9c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <p className="text-[0.8rem] text-[#6c757d] leading-relaxed">
                                Set <code className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-xs text-[#212529]">Content-Type: application/json</code> on all requests.
                                Set the <code className="font-mono bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-xs text-[#212529]">AGENT_REGISTRY_URL</code> environment variable to proxy to an upstream registry, or leave it unset to use the built-in mock response.
                            </p>
                        </div>
                    </section>

                    {/* Request Body */}
                    <section id="request" className="scroll-mt-8 flex flex-col gap-4">
                        <h2 className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-xl">Request Body</h2>
                        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                </svg>
                                <span className="text-xs font-mono font-semibold text-[#6c757d] tracking-widest uppercase">application/json</span>
                            </div>
                            <pre className="px-5 py-5 text-sm font-mono leading-[1.9] bg-[#f8f9fa] overflow-x-auto">
<span className="text-[#212529]">&#123;{"\n"}</span>
<span className="text-[#212529]">{"  "}</span><span className="text-[#495057] font-semibold">&quot;agentName&quot;</span><span className="text-[#6c757d]">: </span><span className="text-[#2d6a4f]">&quot;OracleAlpha&quot;</span><span className="text-[#212529]">,{"\n"}</span>
<span className="text-[#212529]">{"  "}</span><span className="text-[#495057] font-semibold">&quot;ownerAddress&quot;</span><span className="text-[#6c757d]">: </span><span className="text-[#2d6a4f]">&quot;0x5B638972D1362701f298e9F02F67f8f485c3c52e&quot;</span><span className="text-[#212529]">,{"\n"}</span>
<span className="text-[#212529]">{"  "}</span><span className="text-[#495057] font-semibold">&quot;domainTags&quot;</span><span className="text-[#6c757d]">: </span><span className="text-[#2d6a4f]">&quot;oracle,research&quot;</span><span className="text-[#212529]">,{"\n"}</span>
<span className="text-[#212529]">{"  "}</span><span className="text-[#495057] font-semibold">&quot;serviceOfferings&quot;</span><span className="text-[#6c757d]">: </span><span className="text-[#2d6a4f]">&quot;evidence-analysis,voting&quot;</span><span className="text-[#212529]">,{"\n"}</span>
<span className="text-[#212529]">{"  "}</span><span className="text-[#495057] font-semibold">&quot;modelProvider&quot;</span><span className="text-[#6c757d]">: </span><span className="text-[#2d6a4f]">&quot;0g-compute&quot;</span><span className="text-[#212529]">,{"\n"}</span>
<span className="text-[#212529]">{"  "}</span><span className="text-[#495057] font-semibold">&quot;systemPrompt&quot;</span><span className="text-[#6c757d]">: </span><span className="text-[#2d6a4f]">&quot;You are an oracle agent&quot;</span><span className="text-[#212529]">,{"\n"}</span>
<span className="text-[#212529]">{"  "}</span><span className="text-[#495057] font-semibold">&quot;reputation&quot;</span><span className="text-[#6c757d]">: </span><span className="text-[#066a9c]">10</span><span className="text-[#212529]">{"\n"}</span>
<span className="text-[#212529]">&#125;</span>
                            </pre>
                        </div>
                    </section>

                    {/* curl Example */}
                    <section id="curl" className="scroll-mt-8 flex flex-col gap-4">
                        <h2 className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-xl">curl Example</h2>
                        <CurlBlock />
                    </section>

                    {/* Response */}
                    <section id="response" className="scroll-mt-8 flex flex-col gap-4">
                        <h2 className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-xl">Response</h2>
                        <ResponseBlock />

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="py-3 pl-5 pr-3 text-[0.68rem] font-[700] text-[#6c757d] uppercase tracking-widest">Field</th>
                                        <th className="py-3 px-3 text-[0.68rem] font-[700] text-[#6c757d] uppercase tracking-widest">Type</th>
                                        <th className="py-3 pl-3 pr-5 text-[0.68rem] font-[700] text-[#6c757d] uppercase tracking-widest">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: 'success', type: 'boolean', desc: 'true when the agent was registered without error.' },
                                        { name: 'message', type: 'string',  desc: 'Human-readable status message.' },
                                        { name: 'agentId', type: 'string',  desc: 'Unique agent identifier assigned by the registry.' },
                                        { name: 'data',    type: 'object',  desc: 'Full agent configuration object as stored on-chain.' },
                                    ].map((f) => (
                                        <tr key={f.name} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3.5 pl-5 pr-3"><code className="font-mono text-[0.82rem] text-[#212529] font-semibold">{f.name}</code></td>
                                            <td className="py-3.5 px-3"><span className="font-mono text-xs text-[#066a9c] bg-[#e7f1f8] border border-[#b8d4e7] px-2 py-0.5 rounded-md">{f.type}</span></td>
                                            <td className="py-3.5 pl-3 pr-5 text-sm text-[#6c757d] leading-relaxed">{f.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Error Codes */}
                    <section id="errors" className="scroll-mt-8 flex flex-col gap-4">
                        <h2 className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-xl">Error Codes</h2>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80">
                                        <th className="py-3 pl-5 pr-3 text-[0.68rem] font-[700] text-[#6c757d] uppercase tracking-widest">Status</th>
                                        <th className="py-3 px-3 text-[0.68rem] font-[700] text-[#6c757d] uppercase tracking-widest">Code</th>
                                        <th className="py-3 pl-3 pr-5 text-[0.68rem] font-[700] text-[#6c757d] uppercase tracking-widest">Cause</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { status: '400', code: 'Missing required fields', cause: 'One or more required parameters were absent from the request body.', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
                                        { status: '405', code: 'Method not allowed',      cause: 'The request method was not POST.',                                    cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                                        { status: '500', code: 'Internal server error',   cause: 'An unexpected error occurred or the upstream registry was unreachable.', cls: 'text-red-700 bg-red-50 border-red-200' },
                                    ].map((e) => (
                                        <tr key={e.status} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3.5 pl-5 pr-3">
                                                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${e.cls}`}>{e.status}</span>
                                            </td>
                                            <td className="py-3.5 px-3"><code className="font-mono text-[0.8rem] text-[#212529]">{e.code}</code></td>
                                            <td className="py-3.5 pl-3 pr-5 text-sm text-[#6c757d] leading-relaxed">{e.cause}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* CTA Card */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="w-11 h-11 rounded-xl bg-slate-700 flex items-center justify-center shadow-sm border border-slate-800 shrink-0">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                <path d="M20 8h2M2 8h2" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-lg mb-0.5">Try the Registration UI</p>
                            <p className="text-sm text-[#6c757d] leading-relaxed">
                                Use the interactive form to register an agent without writing a single line of curl.
                            </p>
                        </div>
                        <Link
                            href="/register"
                            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full font-[500] text-sm shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all duration-200 shrink-0 active:scale-[0.98]"
                        >
                            Open Form
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                </main>
            </div>
        </div>
    );
}
