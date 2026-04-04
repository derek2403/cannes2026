import { useState, useEffect, useRef } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import { SPARKINFT_ADDRESS, SPARKINFT_ABI } from "@/lib/sparkinft-abi";

// ── Types ───────────────────────────────────────────────────────
interface HederaAgentState {
  displayName: string;
  accountId?: string;
  profileTopicId?: string;
  reputationTopicId?: string;
  registryTopicId?: string;
  inftTokenId?: number;
  modelProvider?: string;
  reputation?: number;
  capabilities?: number[];
}

interface AgentInfo {
  tokenId: number;
  botId: string;
  domainTags: string;
  serviceOfferings: string;
  cronEnabled: boolean;
  owner: string;
  createdAt: string;
  // Hedera identity (merged from hedera-state.json)
  accountId?: string;
  profileTopicId?: string;
  reputationTopicId?: string;
  registryTopicId?: string;
  modelProvider?: string;
  reputation?: number;
}

interface ChatMsg {
  role: "user" | "agent";
  text: string;
}

// ── Colors (Spark warm palette) ─────────────────────────────────
const C = {
  bg: "#f5f0e8",
  card: "#ffffff",
  cardBorder: "#e2d5c3",
  text: "#483519",
  muted: "#8b7355",
  green: "#4B7F52",
  orange: "#DD6E42",
  btnPrimary: "#483519",
  btnHover: "#5a4520",
  inputBorder: "#d4c4a8",
  inputBg: "#faf8f4",
};

const MODEL_OPTIONS = [
  { value: "0g-compute", label: "0G Compute (TEE)" },
  { value: "openai", label: "OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
];

// ═════════════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ═════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // ── Agents list ─────────────────────────────────────────────
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // ── Create form ─────────────────────────────────────────────
  const [form, setForm] = useState({
    agentName: "",
    domainTags: "oracle,research",
    serviceOfferings: "evidence-analysis,voting",
    modelProvider: "0g-compute",
    apiKey: "",
    systemPrompt: "",
    researchInstructions: "",
  });
  const [mintStep, setMintStep] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // ── Detail modal ────────────────────────────────────────────
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  // ── Chat ────────────────────────────────────────────────────
  const [chatAgent, setChatAgent] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Load agents on connect ──────────────────────────────────
  useEffect(() => {
    if (isConnected && address && publicClient) {
      loadAgents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  async function loadAgents() {
    if (!publicClient || !address) return;
    setLoadingAgents(true);
    try {
      // Fetch Hedera state in parallel with on-chain data
      let hederaAgents: HederaAgentState[] = [];
      try {
        const stateRes = await fetch("/api/agents/state");
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          hederaAgents = stateData.agents || [];
        }
      } catch {
        /* hedera state unavailable */
      }

      const total = await publicClient.readContract({
        address: SPARKINFT_ADDRESS,
        abi: SPARKINFT_ABI,
        functionName: "totalMinted",
      });
      const tot = Number(total as bigint);
      const owned: AgentInfo[] = [];

      for (let i = 1; i <= tot; i++) {
        try {
          const owner = await publicClient.readContract({
            address: SPARKINFT_ADDRESS,
            abi: SPARKINFT_ABI,
            functionName: "ownerOf",
            args: [BigInt(i)],
          });
          if ((owner as string).toLowerCase() === address.toLowerCase()) {
            const profile = await publicClient.readContract({
              address: SPARKINFT_ADDRESS,
              abi: SPARKINFT_ABI,
              functionName: "getAgentProfile",
              args: [BigInt(i)],
            });
            const p = profile as {
              botId: string;
              domainTags: string;
              serviceOfferings: string;
              cronEnabled: boolean;
              createdAt: bigint;
            };

            // Merge Hedera identity by matching botId or inftTokenId
            const hedera = hederaAgents.find(
              (h) => h.inftTokenId === i || h.displayName === p.botId
            );

            owned.push({
              tokenId: i,
              botId: p.botId,
              domainTags: p.domainTags,
              serviceOfferings: p.serviceOfferings,
              cronEnabled: p.cronEnabled,
              owner: owner as string,
              createdAt: Number(p.createdAt)
                ? new Date(Number(p.createdAt) * 1000).toISOString()
                : "",
              // Hedera fields
              accountId: hedera?.accountId,
              profileTopicId: hedera?.profileTopicId,
              reputationTopicId: hedera?.reputationTopicId,
              registryTopicId: hedera?.registryTopicId,
              modelProvider: hedera?.modelProvider,
              reputation: hedera?.reputation ?? 10,
            });
          }
        } catch {
          /* skip */
        }
      }

      setAgents(owned);
    } catch {
      /* silent */
    } finally {
      setLoadingAgents(false);
    }
  }

  // ── Mint handler ────────────────────────────────────────────
  async function handleMint() {
    if (!form.agentName.trim()) return;
    setMintStep("Uploading config + minting iNFT + registering on Hedera...");
    setMintError(null);
    try {
      const res = await fetch("/api/inft/register-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mint failed");

      const hederaInfo = data.hedera?.accountId
        ? ` | Hedera: ${data.hedera.accountId}`
        : "";
      setMintStep(`Done! iNFT #${data.tokenId} minted${hederaInfo}`);
      setForm({
        agentName: "",
        domainTags: "oracle,research",
        serviceOfferings: "evidence-analysis,voting",
        modelProvider: "0g-compute",
        apiKey: "",
        systemPrompt: "",
        researchInstructions: "",
      });
      // Reload agents
      setTimeout(() => {
        loadAgents();
        setMintStep(null);
        setShowCreate(false);
      }, 2000);
    } catch (err: unknown) {
      setMintError(err instanceof Error ? err.message : String(err));
      setMintStep(null);
    }
  }

  // ── Chat handler ────────────────────────────────────────────
  async function handleChat() {
    if (!address || !chatInput.trim() || chatAgent === null) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/inft/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: chatAgent,
          message: msg,
          userAddress: address,
        }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          text: res.ok
            ? data.response + (data.simulated ? " [simulated]" : "")
            : `Error: ${data.error}`,
        },
      ]);
    } catch (err: unknown) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  function openChat(tokenId: number) {
    if (chatAgent === tokenId) {
      setChatAgent(null);
      setChatHistory([]);
    } else {
      setChatAgent(tokenId);
      setChatHistory([]);
      setChatInput("");
    }
  }

  // ── Form field updater ──────────────────────────────────────
  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          borderBottom: `1px solid ${C.cardBorder}`,
          background: C.card,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            Agent Dashboard
          </span>
          <span
            style={{
              fontSize: 11,
              color: C.muted,
              background: C.bg,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            ERC-7857 iNFT
          </span>
        </div>
        <ConnectWallet />
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
        {!isConnected ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: C.muted,
            }}
          >
            <p style={{ fontSize: 18, marginBottom: 8 }}>
              Connect your wallet to manage your agents
            </p>
            <p style={{ fontSize: 14 }}>0G Galileo Testnet (Chain 16602)</p>
          </div>
        ) : (
          <>
            {/* ── CREATE AGENT ─────────────────────────────────── */}
            <section style={{ marginBottom: 32 }}>
              <button
                onClick={() => setShowCreate(!showCreate)}
                style={{
                  background: C.btnPrimary,
                  color: "#fff",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>+</span> Create Agent iNFT
              </button>

              {showCreate && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 24,
                    background: C.card,
                    border: `1px solid ${C.cardBorder}`,
                    borderRadius: 12,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 20px",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    New Agent Configuration
                  </h3>

                  {/* Row 1: Name, Domain, Service */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    <FormField
                      label="Agent Name"
                      value={form.agentName}
                      onChange={(v) => setField("agentName", v)}
                      placeholder="ResearchBot"
                      required
                    />
                    <FormField
                      label="Domain Tags"
                      value={form.domainTags}
                      onChange={(v) => setField("domainTags", v)}
                      placeholder="oracle,research"
                    />
                    <FormField
                      label="Service Offerings"
                      value={form.serviceOfferings}
                      onChange={(v) => setField("serviceOfferings", v)}
                      placeholder="evidence-analysis,voting"
                    />
                  </div>

                  {/* Row 2: Model + API Key */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.text,
                          marginBottom: 6,
                        }}
                      >
                        Model Provider
                      </label>
                      <select
                        value={form.modelProvider}
                        onChange={(e) =>
                          setField("modelProvider", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: `1px solid ${C.inputBorder}`,
                          borderRadius: 6,
                          background: C.inputBg,
                          color: C.text,
                          fontSize: 14,
                        }}
                      >
                        {MODEL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {form.modelProvider !== "0g-compute" && (
                      <FormField
                        label="API Key"
                        value={form.apiKey}
                        onChange={(v) => setField("apiKey", v)}
                        placeholder="sk-..."
                        type="password"
                      />
                    )}

                    {form.modelProvider === "0g-compute" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "#f0f7f1",
                          border: `1px solid ${C.green}33`,
                          borderRadius: 6,
                          fontSize: 13,
                          color: C.green,
                          marginTop: 22,
                        }}
                      >
                        TEE-verified inference — no API key needed
                      </div>
                    )}
                  </div>

                  {/* Textareas */}
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 6,
                      }}
                    >
                      System Prompt
                    </label>
                    <textarea
                      value={form.systemPrompt}
                      onChange={(e) => setField("systemPrompt", e.target.value)}
                      rows={3}
                      placeholder="You are a research agent specializing in..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${C.inputBorder}`,
                        borderRadius: 6,
                        background: C.inputBg,
                        color: C.text,
                        fontSize: 14,
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 6,
                      }}
                    >
                      Research Instructions
                    </label>
                    <textarea
                      value={form.researchInstructions}
                      onChange={(e) =>
                        setField("researchInstructions", e.target.value)
                      }
                      rows={3}
                      placeholder="Focus on finding primary sources, cross-reference at least 3 outlets..."
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${C.inputBorder}`,
                        borderRadius: 6,
                        background: C.inputBg,
                        color: C.text,
                        fontSize: 14,
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  {/* Mint button */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <button
                      onClick={handleMint}
                      disabled={!form.agentName.trim() || !!mintStep}
                      style={{
                        background: C.btnPrimary,
                        color: "#fff",
                        border: "none",
                        padding: "10px 28px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor:
                          !form.agentName.trim() || !!mintStep
                            ? "not-allowed"
                            : "pointer",
                        opacity: !form.agentName.trim() || !!mintStep ? 0.6 : 1,
                      }}
                    >
                      {mintStep ? "Minting..." : "Mint Agent iNFT"}
                    </button>

                    {mintStep && (
                      <span style={{ fontSize: 13, color: C.orange }}>
                        {mintStep}
                      </span>
                    )}
                    {mintError && (
                      <span style={{ fontSize: 13, color: "#dc2626" }}>
                        {mintError}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* ── MY AGENTS GRID ───────────────────────────────── */}
            <section>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  My Agents
                  {agents.length > 0 && (
                    <span
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        fontWeight: 400,
                        marginLeft: 8,
                      }}
                    >
                      ({agents.length})
                    </span>
                  )}
                </h2>
                <button
                  onClick={loadAgents}
                  disabled={loadingAgents}
                  style={{
                    background: "none",
                    border: `1px solid ${C.cardBorder}`,
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    color: C.muted,
                    cursor: loadingAgents ? "wait" : "pointer",
                  }}
                >
                  {loadingAgents ? "Loading..." : "Refresh"}
                </button>
              </div>

              {loadingAgents && agents.length === 0 && (
                <p style={{ color: C.muted, textAlign: "center", padding: 40 }}>
                  Loading agents from chain...
                </p>
              )}

              {!loadingAgents && agents.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: C.card,
                    border: `1px solid ${C.cardBorder}`,
                    borderRadius: 12,
                    color: C.muted,
                  }}
                >
                  <p style={{ fontSize: 16, marginBottom: 8 }}>
                    No agents found
                  </p>
                  <p style={{ fontSize: 13 }}>
                    Create your first agent iNFT above to get started
                  </p>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                }}
              >
                {agents.map((agent) => (
                  <div key={agent.tokenId}>
                    {/* Agent Card */}
                    <div
                      style={{
                        background: C.card,
                        border: `1px solid ${C.cardBorder}`,
                        borderRadius: 12,
                        padding: 20,
                        transition: "box-shadow 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 16,
                              fontWeight: 600,
                            }}
                          >
                            {agent.botId}
                          </h3>
                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            <span
                              style={{
                                fontSize: 11,
                                color: C.muted,
                              }}
                            >
                              iNFT #{agent.tokenId}
                            </span>
                            {agent.accountId && (
                              <a
                                href={`https://hashscan.io/testnet/account/${agent.accountId}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: 11,
                                  color: C.green,
                                  textDecoration: "none",
                                }}
                              >
                                {agent.accountId}
                              </a>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 4 }}>
                          <span
                            style={{
                              fontSize: 12,
                              color: C.green,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: agent.cronEnabled
                                  ? C.green
                                  : C.muted,
                                display: "inline-block",
                              }}
                            />
                            {agent.cronEnabled ? "Active" : "Idle"}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: C.orange,
                              fontWeight: 600,
                            }}
                          >
                            REP: {agent.reputation ?? 10}
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginBottom: 12,
                        }}
                      >
                        {agent.domainTags
                          .split(",")
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                background: `${C.green}15`,
                                color: C.green,
                                borderRadius: 4,
                              }}
                            >
                              {tag.trim()}
                            </span>
                          ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() =>
                            setSelectedAgent(
                              selectedAgent?.tokenId === agent.tokenId
                                ? null
                                : agent
                            )
                          }
                          style={{
                            flex: 1,
                            padding: "7px 0",
                            border: `1px solid ${C.cardBorder}`,
                            borderRadius: 6,
                            background: "none",
                            color: C.text,
                            fontSize: 13,
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          {selectedAgent?.tokenId === agent.tokenId
                            ? "Close"
                            : "View"}
                        </button>
                        <button
                          onClick={() => openChat(agent.tokenId)}
                          style={{
                            flex: 1,
                            padding: "7px 0",
                            border: "none",
                            borderRadius: 6,
                            background: C.btnPrimary,
                            color: "#fff",
                            fontSize: 13,
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          {chatAgent === agent.tokenId ? "Close Chat" : "Chat"}
                        </button>
                      </div>
                    </div>

                    {/* ── Detail Panel ── */}
                    {selectedAgent?.tokenId === agent.tokenId && (
                      <DetailPanel agent={agent} />
                    )}

                    {/* ── Chat Panel ── */}
                    {chatAgent === agent.tokenId && (
                      <div
                        style={{
                          marginTop: 8,
                          background: C.card,
                          border: `1px solid ${C.cardBorder}`,
                          borderRadius: 12,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 16px",
                            borderBottom: `1px solid ${C.cardBorder}`,
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text,
                          }}
                        >
                          Chat with {agent.botId}
                        </div>

                        <div
                          style={{
                            padding: 12,
                            minHeight: 160,
                            maxHeight: 300,
                            overflowY: "auto",
                            background: C.inputBg,
                          }}
                        >
                          {chatHistory.length === 0 && (
                            <p
                              style={{
                                color: C.muted,
                                fontSize: 13,
                                margin: 0,
                              }}
                            >
                              Send a message to start...
                            </p>
                          )}
                          {chatHistory.map((m, i) => (
                            <div
                              key={i}
                              style={{
                                margin: "8px 0",
                                textAlign:
                                  m.role === "user" ? "right" : "left",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "8px 12px",
                                  borderRadius: 10,
                                  maxWidth: "85%",
                                  fontSize: 13,
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  background:
                                    m.role === "user" ? C.btnPrimary : C.card,
                                  color:
                                    m.role === "user" ? "#fff" : C.text,
                                  border:
                                    m.role === "agent"
                                      ? `1px solid ${C.cardBorder}`
                                      : "none",
                                }}
                              >
                                {m.text}
                              </span>
                            </div>
                          ))}
                          {chatLoading && (
                            <div
                              style={{
                                fontSize: 13,
                                color: C.muted,
                                margin: "8px 0",
                              }}
                            >
                              Thinking...
                            </div>
                          )}
                          <div ref={chatEndRef} />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            padding: "8px 12px",
                            borderTop: `1px solid ${C.cardBorder}`,
                          }}
                        >
                          <input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              !chatLoading &&
                              handleChat()
                            }
                            placeholder="Ask your agent..."
                            disabled={chatLoading}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: `1px solid ${C.inputBorder}`,
                              borderRadius: 6,
                              background: C.inputBg,
                              color: C.text,
                              fontSize: 14,
                            }}
                          />
                          <button
                            onClick={handleChat}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{
                              background: C.btnPrimary,
                              color: "#fff",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor:
                                chatLoading || !chatInput.trim()
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                chatLoading || !chatInput.trim() ? 0.6 : 1,
                            }}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Contract info ─────────────────────────────────── */}
            <div
              style={{
                marginTop: 40,
                padding: "12px 0",
                borderTop: `1px solid ${C.cardBorder}`,
                fontSize: 12,
                color: C.muted,
                textAlign: "center",
              }}
            >
              SparkINFT:{" "}
              <a
                href={`https://chainscan-galileo.0g.ai/address/${SPARKINFT_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: C.green }}
              >
                {SPARKINFT_ADDRESS}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: C.text,
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: C.orange }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: `1px solid ${C.inputBorder}`,
          borderRadius: 6,
          background: C.inputBg,
          color: C.text,
          fontSize: 14,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function DetailPanel({ agent }: { agent: AgentInfo }) {
  return (
    <div
      style={{
        marginTop: 8,
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <h4
        style={{
          margin: "0 0 16px",
          fontSize: 15,
          fontWeight: 600,
          color: C.text,
        }}
      >
        {agent.botId}{" "}
        <span style={{ fontWeight: 400, color: C.muted }}>
          — iNFT #{agent.tokenId}
        </span>
      </h4>

      {/* 0G Identity */}
      <DetailSection title="0G Chain Identity">
        <DetailRow
          label="Owner"
          value={`${agent.owner.slice(0, 6)}...${agent.owner.slice(-4)}`}
        />
        <DetailRow
          label="iNFT Token"
          value={`#${agent.tokenId}`}
          link={`https://chainscan-galileo.0g.ai/address/${SPARKINFT_ADDRESS}`}
        />
        <DetailRow
          label="Contract"
          value={`${SPARKINFT_ADDRESS.slice(0, 10)}...`}
          link={`https://chainscan-galileo.0g.ai/address/${SPARKINFT_ADDRESS}`}
        />
        {agent.createdAt && (
          <DetailRow
            label="Created"
            value={new Date(agent.createdAt).toLocaleDateString()}
          />
        )}
      </DetailSection>

      {/* Hedera Identity */}
      <DetailSection title="Hedera Identity">
        {agent.accountId ? (
          <>
            <DetailRow
              label="Account"
              value={agent.accountId}
              link={`https://hashscan.io/testnet/account/${agent.accountId}`}
            />
            <DetailRow
              label="DID"
              value={`uaid:did:hedera:testnet:${agent.accountId}`}
            />
            {agent.profileTopicId && (
              <DetailRow
                label="HCS-11 Profile"
                value={agent.profileTopicId}
                link={`https://hashscan.io/testnet/topic/${agent.profileTopicId}`}
              />
            )}
            {agent.registryTopicId && (
              <DetailRow
                label="HCS-2 Registry"
                value={agent.registryTopicId}
                link={`https://hashscan.io/testnet/topic/${agent.registryTopicId}`}
              />
            )}
            {agent.reputationTopicId && (
              <DetailRow
                label="HCS-20 Reputation"
                value={agent.reputationTopicId}
                link={`https://hashscan.io/testnet/topic/${agent.reputationTopicId}`}
              />
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>
            No Hedera identity linked
          </div>
        )}
      </DetailSection>

      {/* Reputation */}
      <DetailSection title="Reputation">
        <DetailRow
          label="Score"
          value={`${agent.reputation ?? 10} REP`}
          color={C.green}
        />
        <DetailRow
          label="Standards"
          value="HCS-2, HCS-11, HCS-16, HCS-20"
        />
      </DetailSection>

      {/* Config */}
      <DetailSection title="Configuration">
        {agent.modelProvider && (
          <DetailRow
            label="Model"
            value={
              agent.modelProvider === "0g-compute"
                ? "0G Compute (TEE)"
                : agent.modelProvider
            }
          />
        )}
        <DetailRow label="Domain" value={agent.domainTags || "—"} />
        <DetailRow
          label="Services"
          value={agent.serviceOfferings || "—"}
        />
        <DetailRow
          label="Cron"
          value={agent.cronEnabled ? "Enabled" : "Disabled"}
          color={agent.cronEnabled ? C.green : C.muted}
        />
      </DetailSection>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
          color: C.muted,
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: `1px solid ${C.cardBorder}`,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  link,
  color,
}: {
  label: string;
  value: string;
  link?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "4px 0",
        fontSize: 13,
      }}
    >
      <span style={{ color: C.muted }}>{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          style={{ color: C.green, textDecoration: "none" }}
        >
          {value}
        </a>
      ) : (
        <span style={{ color: color || C.text, fontWeight: 500 }}>
          {value}
        </span>
      )}
    </div>
  );
}
