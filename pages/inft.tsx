import { useState, useRef, useEffect } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import {
  useAccount,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { keccak256, toBytes } from "viem";
import { SPARKINFT_ADDRESS, SPARKINFT_ABI } from "@/lib/sparkinft-abi";

interface ResultData {
  success: boolean;
  [key: string]: unknown;
}

const btnStyle = {
  background: "#ea580c",
  color: "#fff",
  border: "none",
  padding: "8px 18px",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: 600 as const,
};

export default function INFTPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // ── Mint state ─────────────────────────────────────────────────
  const [botId, setBotId] = useState("agent-001");
  const [domainTags, setDomainTags] = useState("defi,analytics");
  const [serviceOfferings, setServiceOfferings] = useState("scraping,analysis");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AI agent specializing in DeFi analytics. You provide concise, actionable insights."
  );
  const modelProvider = "0g-compute";
  const [mintResult, setMintResult] = useState<ResultData | null>(null);
  const [mintLoading, setMintLoading] = useState(false);

  // ── My iNFTs state ────────────────────────────────────────────
  const [myTokens, setMyTokens] = useState<ResultData | null>(null);
  const [myTokensLoading, setMyTokensLoading] = useState(false);

  // ── Chat state ────────────────────────────────────────────────
  const [chatTokenId, setChatTokenId] = useState("1");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "agent"; text: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);

  // ── View profile state ────────────────────────────────────────
  const [viewTokenId, setViewTokenId] = useState("1");
  const [profileResult, setProfileResult] = useState<ResultData | null>(null);

  // ── Cron state ────────────────────────────────────────────────
  const [cronTokenId, setCronTokenId] = useState("1");
  const [cronInterval, setCronInterval] = useState("5");
  const [cronPrompt, setCronPrompt] = useState("Give me a realistic current ETH/USD price with 2 decimal places. Vary it slightly each time like a live ticker. Just the price and 1-word direction (up/down).");
  const [cronResult, setCronResult] = useState<ResultData | null>(null);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronLog, setCronLog] = useState<{ time: string; text: string }[]>([]);
  const cronTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cronStoppedRef = useRef(false);
  const cronLogEndRef = useRef<HTMLDivElement>(null);


  // ══════════════════════════════════════════════════════════════
  //  HANDLERS
  // ══════════════════════════════════════════════════════════════

  async function handleMint() {
    if (!address) return;
    setMintResult(null);
    setMintLoading(true);
    try {
      setMintResult({ success: true, message: "Step 1/2: Uploading config to 0G Storage..." });

      const uploadRes = await fetch("/api/inft/upload-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId, domainTags, serviceOfferings, systemPrompt,
          modelProvider, persona: botId,
        }),
      });

      let dataDescription: string;
      let dataHash: `0x${string}`;

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        dataDescription = uploadData.dataDescription;
        dataHash = uploadData.dataHash as `0x${string}`;
        setMintResult({ success: true, message: `Step 1/2: Config uploaded! Root: ${uploadData.rootHash?.slice(0, 16)}...` });
      } else {
        const profileJson = JSON.stringify({ botId, domainTags, serviceOfferings, systemPrompt });
        dataHash = keccak256(toBytes(profileJson));
        dataDescription = `spark-agent://${botId}`;
        setMintResult({ success: true, message: "Step 1/2: Storage unavailable, using local hash..." });
      }

      setMintResult({ success: true, message: "Step 2/2: Minting iNFT on 0G Chain..." });

      const hash = await writeContractAsync({
        address: SPARKINFT_ADDRESS,
        abi: SPARKINFT_ABI,
        functionName: "mintAgent",
        args: [address, botId, domainTags, serviceOfferings, [{ dataDescription, dataHash }]],
      });

      setMintResult({ success: true, txHash: hash, message: "iNFT minted!", dataDescription });
    } catch (err: unknown) {
      setMintResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setMintLoading(false);
    }
  }

  async function handleMyTokens() {
    if (!publicClient || !address) return;
    setMyTokensLoading(true);
    setMyTokens(null);
    try {
      const total = await publicClient.readContract({
        address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
        functionName: "totalMinted",
      });
      const tot = Number(total as bigint);
      const ownedTokens: { tokenId: number; botId: string; domainTags: string; cronEnabled: boolean }[] = [];

      for (let i = 1; i <= tot; i++) {
        try {
          const owner = await publicClient.readContract({
            address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
            functionName: "ownerOf", args: [BigInt(i)],
          });
          if ((owner as string).toLowerCase() === address.toLowerCase()) {
            const profile = await publicClient.readContract({
              address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
              functionName: "getAgentProfile", args: [BigInt(i)],
            });
            const p = profile as { botId: string; domainTags: string; cronEnabled: boolean };
            ownedTokens.push({ tokenId: i, botId: p.botId, domainTags: p.domainTags, cronEnabled: p.cronEnabled });
          }
        } catch { /* skip */ }
      }

      setMyTokens({ success: true, count: ownedTokens.length, tokens: ownedTokens });
    } catch (err: unknown) {
      setMyTokens({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setMyTokensLoading(false);
    }
  }

  async function handleViewProfile() {
    if (!publicClient) return;
    setProfileResult(null);
    try {
      const tokenId = BigInt(viewTokenId);
      const [profile, owner] = await Promise.all([
        publicClient.readContract({
          address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
          functionName: "getAgentProfile", args: [tokenId],
        }),
        publicClient.readContract({
          address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
          functionName: "ownerOf", args: [tokenId],
        }),
      ]);

      const p = profile as {
        botId: string; domainTags: string; serviceOfferings: string;
        createdAt: bigint; updatedAt: bigint;
        cronSchedule: string; cronPrompt: string; cronEnabled: boolean;
        executor: string; lastExecution: bigint; executionCount: bigint;
        x402Wallet: string;
      };

      setProfileResult({
        success: true,
        tokenId: viewTokenId,
        owner: owner as string,
        botId: p.botId,
        domainTags: p.domainTags,
        serviceOfferings: p.serviceOfferings,
        createdAt: new Date(Number(p.createdAt) * 1000).toISOString(),
        cronSchedule: p.cronSchedule || "(none)",
        cronEnabled: p.cronEnabled,
        executionCount: Number(p.executionCount),
        x402Wallet: p.x402Wallet,
      });
    } catch (err: unknown) {
      setProfileResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleChat() {
    if (!address || !chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/inft/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: Number(chatTokenId), message: userMsg, userAddress: address }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        { role: "agent", text: res.ok ? data.response + (data.simulated ? " [simulated]" : "") : `Error: ${data.error}` },
      ]);
    } catch (err: unknown) {
      setChatHistory((prev) => [
        ...prev,
        { role: "agent", text: `Error: ${err instanceof Error ? err.message : String(err)}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSetCron() {
    setCronResult(null);
    try {
      const hash = await writeContractAsync({
        address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
        functionName: "setCronConfig",
        args: [BigInt(cronTokenId), `${cronInterval}s`, cronPrompt],
      });
      setCronResult({ success: true, txHash: hash, message: "Cron config saved on-chain!" });
    } catch (err: unknown) {
      setCronResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleToggleCron(enabled: boolean) {
    setCronResult(null);
    try {
      const hash = await writeContractAsync({
        address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
        functionName: "toggleCron",
        args: [BigInt(cronTokenId), enabled],
      });
      setCronResult({ success: true, txHash: hash, message: `Cron ${enabled ? "enabled" : "disabled"}!` });
    } catch (err: unknown) {
      setCronResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Auto-scroll cron log
  useEffect(() => {
    cronLogEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cronLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cronStoppedRef.current = true;
      if (cronTimerRef.current) clearTimeout(cronTimerRef.current);
    };
  }, []);

  function handleStartCron() {
    if (!address || cronRunning) return;
    const intervalSec = Math.max(1, Number(cronInterval));
    const tokenId = Number(cronTokenId);
    const prompt = cronPrompt;

    setCronRunning(true);
    setCronLog([]);
    cronStoppedRef.current = false;
    let tickCount = 0;

    const tick = async () => {
      if (cronStoppedRef.current) return;
      tickCount++;
      const now = new Date().toLocaleTimeString();
      setCronLog((prev) => [...prev, { time: now, text: "⏳ Calling LLM..." }]);
      try {
        const res = await fetch("/api/inft/infer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId, message: prompt + `\n\n[CRON tick #${tickCount} at ${new Date().toISOString()}. Reply in 1 sentence MAX. Just the number and direction.]`, userAddress: address, maxTokens: 60 }),
        });
        const data = await res.json();
        const reply = res.ok
          ? data.response + (data.simulated ? " [simulated]" : "")
          : `Error: ${data.error}`;
        setCronLog((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { time: now, text: reply };
          return updated;
        });
      } catch (err: unknown) {
        setCronLog((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            time: now,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          };
          return updated;
        });
      }
      // Wait intervalSec AFTER response comes back, then next tick
      if (!cronStoppedRef.current) {
        cronTimerRef.current = setTimeout(tick, intervalSec * 1000);
      }
    };

    tick();
  }

  function handleStopCron() {
    cronStoppedRef.current = true;
    if (cronTimerRef.current) {
      clearTimeout(cronTimerRef.current);
      cronTimerRef.current = null;
    }
    setCronRunning(false);
  }

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "monospace", padding: "0 20px", background: "#fff", color: "#000" }}>
      <h1>0GClaw — Autonomous Agent iNFTs</h1>
      <p style={{ color: "#000" }}>
        ERC-7857 INFT + Cron + x402 on 0G Galileo Testnet
      </p>

      <section style={{ margin: "24px 0" }}>
        <ConnectWallet />
      </section>

      {!isConnected && (
        <p style={{ color: "#f59e0b" }}>Connect your wallet to 0G Galileo Testnet.</p>
      )}

      {/* ── My iNFTs ─────────────────────────────────────────── */}
      {isConnected && (
        <section style={{ margin: "24px 0", padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <h2 style={{ marginTop: 0 }}>My iNFTs</h2>
          <button onClick={handleMyTokens} disabled={myTokensLoading} style={{ ...btnStyle, opacity: myTokensLoading ? 0.6 : 1 }}>
            {myTokensLoading ? "Loading..." : "Check My iNFTs"}
          </button>
          {myTokens && myTokens.success && (
            <div style={{ marginTop: 12 }}>
              <p><strong>You own {myTokens.count as number} iNFT(s)</strong></p>
              {(myTokens.tokens as { tokenId: number; botId: string; domainTags: string; cronEnabled: boolean }[]).map((t) => (
                <div key={t.tokenId} style={{ padding: 8, margin: "6px 0", background: "#fff", border: "1px solid #e2e8f0" }}>
                  <strong>#{t.tokenId}</strong> — {t.botId}
                  <span style={{ color: "#666", fontSize: 12, marginLeft: 8 }}>Tags: {t.domainTags}</span>
                  {t.cronEnabled && <span style={{ color: "#22c55e", fontSize: 12, marginLeft: 8 }}>CRON ON</span>}
                </div>
              ))}
              {(myTokens.count as number) === 0 && <p style={{ color: "#000" }}>No iNFTs yet. Mint one below!</p>}
            </div>
          )}
          {myTokens && !myTokens.success && <ResultBlock data={myTokens} />}
        </section>
      )}

      <hr style={{ margin: "24px 0" }} />

      {/* ── Mint ─────────────────────────────────────────────── */}
      <section style={{ margin: "24px 0" }}>
        <h2>Mint Agent iNFT</h2>
        <div>
          <label>Bot ID: <input value={botId} onChange={(e) => setBotId(e.target.value)} style={{ width: 250, fontFamily: "monospace" }} /></label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Domain Tags: <input value={domainTags} onChange={(e) => setDomainTags(e.target.value)} style={{ width: 300, fontFamily: "monospace" }} /></label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Service Offerings: <input value={serviceOfferings} onChange={(e) => setServiceOfferings(e.target.value)} style={{ width: 300, fontFamily: "monospace" }} /></label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>System Prompt:
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3} style={{ width: "100%", fontFamily: "monospace", fontSize: 12, marginTop: 4 }} />
          </label>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>AI Provider: 0G Compute</strong> — Decentralized GPU inference, no API key needed.
          </p>
        </div>
        <button onClick={handleMint} disabled={!isConnected || mintLoading} style={{ ...btnStyle, marginTop: 12, opacity: (!isConnected || mintLoading) ? 0.6 : 1 }}>
          {mintLoading ? "Minting..." : "Mint Agent iNFT"}
        </button>
        {mintResult && <ResultBlock data={mintResult} />}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* ── View Profile ─────────────────────────────────────── */}
      <section style={{ margin: "24px 0" }}>
        <h2>View Agent Profile</h2>
        <div>
          <label>Token ID: <input value={viewTokenId} onChange={(e) => setViewTokenId(e.target.value)} style={{ width: 100, fontFamily: "monospace" }} /></label>
        </div>
        <button onClick={handleViewProfile} style={{ ...btnStyle, marginTop: 8 }}>View Profile</button>
        {profileResult && <ResultBlock data={profileResult} />}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* ── Chat ─────────────────────────────────────────────── */}
      <section style={{ margin: "24px 0" }}>
        <h2>Chat with Agent iNFT</h2>
        <div>
          <label>Token ID: <input value={chatTokenId} onChange={(e) => setChatTokenId(e.target.value)} style={{ width: 100, fontFamily: "monospace" }} /></label>
        </div>
        <div style={{ marginTop: 12, border: "1px solid #e2e8f0", background: "#f8fafc", minHeight: 200, maxHeight: 400, overflowY: "auto", padding: 12 }}>
          {chatHistory.length === 0 && <p style={{ color: "#000", margin: 0 }}>No messages yet.</p>}
          {chatHistory.map((msg, i) => (
            <div key={i} style={{ margin: "8px 0", textAlign: msg.role === "user" ? "right" : "left" }}>
              <span style={{
                display: "inline-block", padding: "8px 12px", borderRadius: 8, maxWidth: "80%",
                background: msg.role === "user" ? "#3b82f6" : "#e2e8f0",
                color: msg.role === "user" ? "#fff" : "#000",
                fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>{msg.text}</span>
            </div>
          ))}
          {chatLoading && <div style={{ margin: "8px 0", color: "#000", fontSize: 13 }}>Agent is thinking...</div>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !chatLoading && handleChat()}
            placeholder="Ask your agent something..."
            disabled={!isConnected || chatLoading}
            style={{ flex: 1, fontFamily: "monospace", padding: "8px 12px" }} />
          <button onClick={handleChat} disabled={!isConnected || chatLoading || !chatInput.trim()} style={{ ...btnStyle, opacity: (!isConnected || chatLoading || !chatInput.trim()) ? 0.6 : 1 }}>Send</button>
        </div>
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* ── Cron Config ──────────────────────────────────────── */}
      <section style={{ margin: "24px 0" }}>
        <h2>Cron — Give Your Agent Time</h2>
        <p style={{ color: "#000", fontSize: 13 }}>Set a schedule for your agent to wake up and act autonomously.</p>
        <div>
          <label>Token ID: <input value={cronTokenId} onChange={(e) => setCronTokenId(e.target.value)} style={{ width: 100, fontFamily: "monospace" }} /></label>
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <label>Every <input type="number" min="1" value={cronInterval} onChange={(e) => setCronInterval(e.target.value)} style={{ width: 70, fontFamily: "monospace", textAlign: "center" }} /> seconds</label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Cron Prompt:
            <textarea value={cronPrompt} onChange={(e) => setCronPrompt(e.target.value)} rows={2}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 12, marginTop: 4 }}
              placeholder="What should the agent do on each tick?" />
          </label>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleSetCron} disabled={!isConnected} style={{ ...btnStyle, opacity: !isConnected ? 0.6 : 1 }}>Save Config On-Chain</button>
          <button onClick={() => handleToggleCron(true)} disabled={!isConnected} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>Enable On-Chain</button>
          <button onClick={() => handleToggleCron(false)} disabled={!isConnected} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>Disable On-Chain</button>
        </div>
        {cronResult && <ResultBlock data={cronResult} />}

        {/* ── Live Cron Executor ── */}
        <div style={{ marginTop: 16, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#000", fontWeight: "bold", fontSize: 14 }}>
              Live Executor {cronRunning && <span style={{ color: "#22c55e", marginLeft: 8, fontSize: 12 }}>● RUNNING</span>}
              {!cronRunning && <span style={{ color: "#000", marginLeft: 8, fontSize: 12 }}>○ STOPPED</span>}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {!cronRunning ? (
                <button onClick={handleStartCron} disabled={!isConnected || !cronPrompt.trim()}
                  style={{ background: "#22c55e", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                  ▶ Start Cron
                </button>
              ) : (
                <button onClick={handleStopCron}
                  style={{ background: "#ef4444", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
                  ■ Stop Cron
                </button>
              )}
              {cronLog.length > 0 && !cronRunning && (
                <button onClick={() => setCronLog([])}
                  style={{ background: "#e2e8f0", color: "#000", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
                  Clear Log
                </button>
              )}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 10, maxHeight: 300, overflowY: "auto", minHeight: 60 }}>
            {cronLog.length === 0 && (
              <p style={{ color: "#000", margin: 0, fontSize: 12 }}>
                No executions yet. Hit Start Cron to run every {cronInterval}s.
              </p>
            )}
            {cronLog.map((entry, i) => (
              <div key={i} style={{ margin: "6px 0", fontSize: 12, borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>
                <span style={{ color: "#6366f1", marginRight: 8 }}>[{entry.time}]</span>
                <span style={{ color: entry.text.startsWith("Error") ? "#ef4444" : "#000", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {entry.text}
                </span>
              </div>
            ))}
            <div ref={cronLogEndRef} />
          </div>
        </div>
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* ── Contract Info ────────────────────────────────────── */}
      <section style={{ margin: "24px 0", fontSize: 12, color: "#000" }}>
        <p>Contract: <a href={`https://chainscan-galileo.0g.ai/address/${SPARKINFT_ADDRESS}`} target="_blank" rel="noreferrer">{SPARKINFT_ADDRESS}</a></p>
      </section>
    </div>
  );
}

function ResultBlock({ data }: { data: ResultData }) {
  return (
    <pre style={{
      background: data.success ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${data.success ? "#86efac" : "#fca5a5"}`,
      padding: 12, marginTop: 8, overflow: "auto", fontSize: 13,
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
