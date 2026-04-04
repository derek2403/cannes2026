import Head from 'next/head';
import React, { useState, useRef } from 'react';
import Header from '../components/header/Header';
import { Roboto, Figtree } from 'next/font/google';

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

type RegisterStatus = 'idle' | 'loading' | 'success' | 'error';

interface FormData {
    agentName: string;
    ownerAddress: string;
    domainTags: string;
    serviceOfferings: string;
    modelProvider: string;
    systemPrompt: string;
}

interface ApiResponse {
    success?: boolean;
    message?: string;
    agentId?: string;
    [key: string]: unknown;
}

const REGISTER_FORM_DEFAULTS: FormData = {
    agentName: 'OracleAlpha',
    ownerAddress: '0x5B638972D1362701f298e9F02F67f8f485c3c52e',
    domainTags: 'oracle,research',
    serviceOfferings: 'evidence-analysis,voting',
    modelProvider: '0g-compute',
    systemPrompt:
        'You are an oracle agent specialized in evidence analysis, market context, and structured reasoning. Produce concise, factual assessments suitable for on-chain registrar and dispute workflows.',
};

export default function Register() {
    const [form, setForm] = useState<FormData>({ ...REGISTER_FORM_DEFAULTS });

    const [status, setStatus] = useState<RegisterStatus>('idle');
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const resultRef = useRef<HTMLDivElement>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setResponse(null);
        setErrorMsg('');

        try {
            const res = await fetch('/api/inft/register-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, reputation: 10 }),
            });

            const data: ApiResponse = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `HTTP error ${res.status}`);
            }

            setResponse(data);
            setStatus('success');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong';
            setErrorMsg(message);
            setStatus('error');
        } finally {
            setTimeout(() => {
                resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    };

    const isLoading = status === 'loading';

    return (
        <div className={`min-h-screen bg-[#f8f9fa] ${roboto.variable} ${figtree.variable} font-[family-name:var(--font-roboto)]`}>
            <Head>
                <title>Register Agent | Ethereum Explorer</title>
                <meta name="description" content="Register an AI agent on-chain with domain tags, service offerings, model provider, and system prompt." />
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400,300&display=swap" rel="stylesheet" />
            </Head>

            <Header />

            <main className="w-[96%] max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12 lg:pt-8 lg:pb-10">

                <form
                    id="register-agent-form"
                    onSubmit={handleSubmit}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 lg:p-9 xl:p-10 grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10 xl:gap-x-12 lg:gap-y-0 gap-7 lg:items-stretch lg:min-h-[min(720px,calc(100dvh-6.5rem))]"
                >
                    {/* ── Left: intro + identity + capabilities ───────────────── */}
                    <div className="flex flex-col gap-6 min-w-0">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shadow-sm border border-slate-800 shrink-0">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                                        <path d="M20 8h2M2 8h2M12 2V1M18.36 3.64l1.41-1.41M5.64 3.64 4.22 2.22" />
                                    </svg>
                                </div>
                                <h1 className="font-['Satoshi',sans-serif] font-[700] text-[#212529] text-2xl sm:text-3xl tracking-tight">
                                    Register Agent
                                </h1>
                            </div>
                            <p className="text-[#6c757d] text-base leading-relaxed max-w-xl pl-[3.25rem]">
                                Deploy an AI agent on-chain. Fill in the identity, capabilities, and system configuration.
                            </p>
                        </div>

                        <div className="h-px bg-gray-100 lg:hidden" />

                        <div>
                            <p className="font-[family-name:var(--font-roboto)] font-[700] text-[#6c757d] text-sm uppercase tracking-widest mb-4">
                                Agent Identity
                            </p>
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="agentName" className="text-base font-[500] text-[#212529]">
                                        Agent Name <span className="text-[#adb5bd] font-normal text-[0.95em]">(optional)</span>
                                    </label>
                                    <input
                                        id="agentName"
                                        name="agentName"
                                        type="text"
                                        value={form.agentName}
                                        onChange={handleChange}
                                        placeholder="Display name for your agent"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f8f9fa] text-black text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="ownerAddress" className="text-base font-[500] text-[#212529]">
                                        Owner Address <span className="text-red-400 text-sm align-top">*</span>
                                    </label>
                                    <input
                                        id="ownerAddress"
                                        name="ownerAddress"
                                        type="text"
                                        value={form.ownerAddress}
                                        onChange={handleChange}
                                        required
                                        placeholder="0x…"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f8f9fa] text-black text-base font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100" />

                        <div>
                            <p className="font-[family-name:var(--font-roboto)] font-[700] text-[#6c757d] text-sm uppercase tracking-widest mb-4">
                                Capabilities
                            </p>
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="domainTags" className="text-base font-[500] text-[#212529]">
                                        Domain Tags <span className="text-red-400 text-sm align-top">*</span>
                                    </label>
                                    <input
                                        id="domainTags"
                                        name="domainTags"
                                        type="text"
                                        value={form.domainTags}
                                        onChange={handleChange}
                                        required
                                        placeholder="tag1,tag2"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f8f9fa] text-black text-base font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                    />
                                    <p className="text-sm text-[#6c757d]">Comma-separated, e.g. <span className="font-mono text-[0.95em]">defi,analytics,oracle</span></p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label htmlFor="serviceOfferings" className="text-base font-[500] text-[#212529]">
                                        Service Offerings <span className="text-red-400 text-sm align-top">*</span>
                                    </label>
                                    <input
                                        id="serviceOfferings"
                                        name="serviceOfferings"
                                        type="text"
                                        value={form.serviceOfferings}
                                        onChange={handleChange}
                                        required
                                        placeholder="offering1,offering2"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f8f9fa] text-black text-base font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                                    />
                                    <p className="text-sm text-[#6c757d]">Comma-separated, e.g. <span className="font-mono text-[0.95em]">scraping,analysis,voting</span></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: model + prompt + submit (uses vertical space) ─── */}
                    <div className="flex flex-col gap-5 min-h-0 min-w-0 lg:h-full lg:border-l lg:border-gray-100 lg:pl-10 xl:pl-11 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                        <div className="flex flex-col flex-1 min-h-0 gap-5 lg:min-h-0">
                            <p className="font-[family-name:var(--font-roboto)] font-[700] text-[#6c757d] text-sm uppercase tracking-widest shrink-0">
                                Model Configuration
                            </p>
                            <div className="flex flex-col gap-2 shrink-0">
                                <label htmlFor="modelProvider" className="text-base font-[500] text-[#212529]">
                                    Model Provider <span className="text-red-400 text-sm align-top">*</span>
                                </label>
                                <select
                                    id="modelProvider"
                                    name="modelProvider"
                                    value={form.modelProvider}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-gray-200 bg-[#f8f9fa] text-black text-base focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all appearance-none cursor-pointer"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236c757d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                                >
                                    <option value="0g-compute">0g-compute</option>
                                    <option value="openai">openai</option>
                                    <option value="anthropic">anthropic</option>
                                    <option value="together">together</option>
                                    <option value="groq">groq</option>
                                    <option value="ollama">ollama</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 flex-1 min-h-[12rem] lg:min-h-0">
                                <label htmlFor="systemPrompt" className="text-base font-[500] text-[#212529] shrink-0">
                                    System Prompt <span className="text-red-400 text-sm align-top">*</span>
                                </label>
                                <textarea
                                    id="systemPrompt"
                                    name="systemPrompt"
                                    value={form.systemPrompt}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    placeholder="Describe how the agent should behave…"
                                    className="w-full flex-1 min-h-[12rem] px-4 py-3 rounded-xl border border-gray-200 bg-[#f8f9fa] text-black text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all resize-y lg:resize-none leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-1 shrink-0">
                            <p className="text-sm text-[#6c757d]">
                                <span className="text-red-400">*</span> Required fields
                            </p>
                            <button
                                id="submit-register-agent"
                                type="submit"
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white px-8 py-3 rounded-full font-[500] text-base shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-200 active:scale-[0.98] w-full sm:w-auto"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Registering…
                                    </>
                                ) : (
                                    <>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 5v14M5 12l7 7 7-7" />
                                        </svg>
                                        Register Agent
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Result Panel */}
                {(status === 'success' || status === 'error') && (
                    <div
                        ref={resultRef}
                        className={`mt-8 rounded-2xl border p-6 sm:p-7 transition-all duration-300 ${status === 'success'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                                {status === 'success' ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-['Satoshi',sans-serif] font-[600] text-lg mb-1.5 ${status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                    {status === 'success' ? 'Agent Registered Successfully' : 'Registration Failed'}
                                </p>
                                {status === 'error' && (
                                    <p className="text-base text-red-700">{errorMsg}</p>
                                )}
                                {status === 'success' && response && (
                                    <pre className="mt-3 text-sm font-mono text-green-900 bg-green-100/60 rounded-xl p-4 sm:p-5 overflow-x-auto whitespace-pre-wrap break-all border border-green-200">
                                        {JSON.stringify(response, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
