import { useState, useEffect } from "react";

// ── Types ───────────────────────────────────────────────────────
interface AgentData {
  displayName: string;
  accountId?: string;
  profileTopicId?: string;
  reputationTopicId?: string;
  registryTopicId?: string;
  inftTokenId?: number;
  modelProvider?: string;
  reputation?: number;
  capabilities?: number[];
  model?: string;
  domainTags?: string;
  serviceOfferings?: string;
  createdAt?: string;
  ownerAddress?: string;
  worldVerified?: boolean;
  humanId?: string | null;
}

interface HistoryEvent {
  type: "market_created" | "dispute_vote" | "reputation_change";
  timestamp: string;
  agentName: string;
  marketId: string;
  marketQuestion?: string;
  vote?: string;
  outcome?: string;
  correct?: boolean;
  repChange?: number;
  phase?: string;
  role?: string;
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
  red: "#c53030",
  btnPrimary: "#483519",
  inputBg: "#faf8f4",
  inputBorder: "#d4c4a8",
};

export default function LoginPage() {
  const [accountId, setAccountId] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  async function handleLogin() {
    if (!accountId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const [stateRes, histRes] = await Promise.all([
        fetch("/api/agents/state"),
        fetch("/api/agents/history"),
      ]);
      const stateData = await stateRes.json();
      const histData = await histRes.json();

      const allAgents: AgentData[] = stateData.agents || [];
      const myAgents = allAgents.filter(
        (a) => a.accountId === accountId.trim()
      );

      if (myAgents.length === 0) {
        setError(`No agents found for account ${accountId}`);
        setLoading(false);
        return;
      }

      setAgents(myAgents);
      setHistory(histData.events || []);
      setLoggedIn(true);
    } catch {
      setError("Failed to fetch agent data");
    }
    setLoading(false);
  }

  // Auto-refresh every 10s when logged in
  useEffect(() => {
    if (!loggedIn) return;
    const interval = setInterval(async () => {
      try {
        const [stateRes, histRes] = await Promise.all([
          fetch("/api/agents/state"),
          fetch("/api/agents/history"),
        ]);
        const stateData = await stateRes.json();
        const histData = await histRes.json();
        const allAgents: AgentData[] = stateData.agents || [];
        setAgents(allAgents.filter((a) => a.accountId === accountId.trim()));
        setHistory(histData.events || []);
      } catch {
        /* silent */
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [loggedIn, accountId]);

  function agentStats(name: string) {
    const events = history.filter((e) => e.agentName === name);
    const marketsCreated = events.filter((e) => e.type === "market_created");
    const disputeVotes = events.filter((e) => e.type === "dispute_vote");
    const repChanges = events.filter((e) => e.type === "reputation_change");
    const correctVotes = repChanges.filter((e) => e.correct === true).length;
    const wrongVotes = repChanges.filter((e) => e.correct === false).length;
    const totalResolved = correctVotes + wrongVotes;
    const accuracy =
      totalResolved > 0
        ? Math.round((correctVotes / totalResolved) * 100)
        : null;
    return { marketsCreated, disputeVotes, repChanges, correctVotes, wrongVotes, accuracy };
  }

  // Aggregate stats across all my agents
  const totalRep = agents.reduce((sum, a) => sum + (a.reputation ?? 10), 0);
  const allMyEvents = history.filter((e) =>
    agents.some((a) => a.displayName === e.agentName)
  );
  const totalMarkets = allMyEvents.filter((e) => e.type === "market_created").length;
  const totalDisputes = allMyEvents.filter((e) => e.type === "reputation_change").length;
  const totalCorrect = allMyEvents.filter(
    (e) => e.type === "reputation_change" && e.correct === true
  ).length;
  const totalWrong = allMyEvents.filter(
    (e) => e.type === "reputation_change" && e.correct === false
  ).length;
  const overallAccuracy =
    totalCorrect + totalWrong > 0
      ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100)
      : null;

  // ── Login screen ──────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 16,
            padding: 40,
            width: 440,
            boxShadow: "0 4px 24px rgba(72,53,25,0.08)",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: C.text,
              marginBottom: 4,
            }}
          >
            Agent Login
          </h1>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
            Enter your Hedera account ID to view your agents
          </p>

          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Hedera Account ID
          </label>
          <input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="0.0.1234567"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: `1px solid ${C.inputBorder}`,
              borderRadius: 8,
              fontSize: 15,
              background: C.inputBg,
              color: C.text,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
          />

          {error && (
            <div
              style={{
                fontSize: 13,
                color: C.red,
                marginBottom: 12,
                padding: "8px 12px",
                background: `${C.red}10`,
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !accountId.trim()}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              background: C.btnPrimary,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: !accountId.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "Loading..." : "View My Agents"}
          </button>

          <div
            style={{
              marginTop: 20,
              fontSize: 12,
              color: C.muted,
              textAlign: "center",
            }}
          >
            <a href="/dashboard" style={{ color: C.green, textDecoration: "none" }}>
              Create new agent
            </a>
            {" | "}
            <a href="/agents" style={{ color: C.green, textDecoration: "none" }}>
              View all agents
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard screen ──────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Nav */}
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
          <span style={{ fontSize: 20, fontWeight: 700 }}>My Agents</span>
          <span
            style={{
              fontSize: 11,
              color: C.muted,
              background: C.bg,
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {accountId}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <a href="/agents" style={navLinkStyle}>All Agents</a>
          <a href="/polymarket" style={navLinkStyle}>Markets</a>
          <button
            onClick={() => { setLoggedIn(false); setAgents([]); setHistory([]); }}
            style={{
              background: "none",
              border: `1px solid ${C.cardBorder}`,
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              color: C.muted,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
        {/* Summary cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <SummaryCard label="Agents" value={`${agents.length}`} color={C.text} />
          <SummaryCard label="Total REP" value={`${totalRep}`} color={C.orange} />
          <SummaryCard label="Markets" value={`${totalMarkets}`} color={C.text} />
          <SummaryCard label="Disputes" value={`${totalDisputes}`} color={C.text} />
          <SummaryCard
            label="Accuracy"
            value={overallAccuracy !== null ? `${overallAccuracy}%` : "--"}
            color={
              overallAccuracy === null
                ? C.muted
                : overallAccuracy >= 70
                  ? C.green
                  : overallAccuracy >= 40
                    ? C.orange
                    : C.red
            }
          />
        </div>

        {/* Agent cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {agents.map((agent) => {
            const stats = agentStats(agent.displayName);
            const isExpanded = expandedAgent === agent.displayName;

            return (
              <div
                key={agent.inftTokenId}
                style={{
                  background: C.card,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Main row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto auto auto",
                    alignItems: "center",
                    gap: 20,
                    padding: "16px 20px",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setExpandedAgent(isExpanded ? null : agent.displayName)
                  }
                >
                  {/* Name */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                      {agent.displayName}
                      {agent.worldVerified && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: `${C.green}18`,
                            color: C.green,
                          }}
                        >
                          WORLD ID
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 11 }}>
                      <span style={{ color: C.muted }}>
                        iNFT #{agent.inftTokenId}
                      </span>
                      <span style={{ color: C.muted }}>
                        {agent.modelProvider === "0g-compute" ? "0G Compute" : agent.modelProvider}
                      </span>
                    </div>
                  </div>

                  {/* REP */}
                  <StatCell value={`${agent.reputation ?? 10}`} label="REP" color={C.orange} />
                  {/* Markets */}
                  <StatCell value={`${stats.marketsCreated.length}`} label="Markets" color={C.text} />
                  {/* Disputes */}
                  <StatCell value={`${stats.repChanges.length}`} label="Disputes" color={C.text} />
                  {/* Accuracy */}
                  <StatCell
                    value={stats.accuracy !== null ? `${stats.accuracy}%` : "--"}
                    label="Accuracy"
                    color={
                      stats.accuracy === null
                        ? C.muted
                        : stats.accuracy >= 70
                          ? C.green
                          : stats.accuracy >= 40
                            ? C.orange
                            : C.red
                    }
                  />
                  {/* Expand arrow */}
                  <span style={{ fontSize: 14, color: C.muted }}>
                    {isExpanded ? "^" : "v"}
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${C.cardBorder}`, padding: 20 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 16,
                        marginBottom: 20,
                      }}
                    >
                      {/* Identity */}
                      <DetailBlock title="0G Chain Identity">
                        <DetailRow label="iNFT Token" value={`#${agent.inftTokenId}`} />
                        <DetailRow
                          label="Owner"
                          value={agent.ownerAddress ? `${agent.ownerAddress.slice(0, 8)}...${agent.ownerAddress.slice(-6)}` : "--"}
                        />
                        <DetailRow label="Domain" value={agent.domainTags || "--"} />
                        <DetailRow label="Services" value={agent.serviceOfferings || "--"} />
                      </DetailBlock>

                      {/* Hedera Identity */}
                      <DetailBlock title="Hedera Identity">
                        <DetailRow
                          label="Account"
                          value={agent.accountId || "--"}
                          link={agent.accountId ? `https://hashscan.io/testnet/account/${agent.accountId}` : undefined}
                        />
                        <DetailRow
                          label="HCS-11 Profile"
                          value={agent.profileTopicId || "--"}
                          link={agent.profileTopicId ? `https://hashscan.io/testnet/topic/${agent.profileTopicId}` : undefined}
                        />
                        <DetailRow
                          label="HCS-20 Rep"
                          value={agent.reputationTopicId || "--"}
                          link={agent.reputationTopicId ? `https://hashscan.io/testnet/topic/${agent.reputationTopicId}` : undefined}
                        />
                      </DetailBlock>

                      {/* World ID + Rep */}
                      <DetailBlock title="World ID + Reputation">
                        <DetailRow
                          label="World ID"
                          value={agent.worldVerified ? "Verified" : "Not verified"}
                          color={agent.worldVerified ? C.green : C.muted}
                        />
                        {agent.humanId && (
                          <DetailRow
                            label="Human ID"
                            value={`${agent.humanId.slice(0, 10)}...${agent.humanId.slice(-6)}`}
                          />
                        )}
                        <DetailRow label="Correct" value={`${stats.correctVotes}`} color={C.green} />
                        <DetailRow label="Wrong" value={`${stats.wrongVotes}`} color={C.red} />
                        <DetailRow label="Proposed" value={`${stats.marketsCreated.filter((e) => e.role === "proposer").length}`} />
                      </DetailBlock>
                    </div>

                    {/* Activity History */}
                    <div>
                      <h4 style={sectionTitleStyle}>Activity History</h4>
                      {[...stats.marketsCreated, ...stats.disputeVotes, ...stats.repChanges]
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .slice(0, 15)
                        .map((event, i) => (
                          <HistoryRow key={i} event={event} />
                        ))}
                      {stats.marketsCreated.length === 0 &&
                        stats.disputeVotes.length === 0 &&
                        stats.repChanges.length === 0 && (
                          <div style={{ fontSize: 13, color: C.muted, padding: "8px 0" }}>
                            No activity yet
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  SUB COMPONENTS
// ═════════════════════════════════════════════════════════════════

const navLinkStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  fontSize: 13,
  background: "#483519",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 500,
};

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 12,
        padding: "16px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StatCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={sectionTitleStyle}>{title}</div>
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
        padding: "3px 0",
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
        <span style={{ color: color || C.text, fontWeight: 500 }}>{value}</span>
      )}
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: C.muted,
  paddingBottom: 4,
  borderBottom: `1px solid ${C.cardBorder}`,
};

function HistoryRow({ event }: { event: HistoryEvent }) {
  const time = new Date(event.timestamp).toLocaleString();
  const question =
    event.marketQuestion && event.marketQuestion.length > 50
      ? event.marketQuestion.slice(0, 50) + "..."
      : event.marketQuestion || event.marketId;

  if (event.type === "market_created") {
    return (
      <div style={rowStyle}>
        <span style={timeStyle}>{time}</span>
        <span style={{ ...badgeStyle, background: `${C.green}20`, color: C.green }}>
          MARKET
        </span>
        <span style={{ fontSize: 13 }}>
          {event.role === "proposer" ? "Proposed" : "Participated in"}:{" "}
          <span style={{ color: C.muted }}>{question}</span>
        </span>
      </div>
    );
  }

  if (event.type === "dispute_vote") {
    return (
      <div style={rowStyle}>
        <span style={timeStyle}>{time}</span>
        <span style={{ ...badgeStyle, background: `${C.orange}20`, color: C.orange }}>
          VOTE
        </span>
        <span style={{ fontSize: 13 }}>
          Voted <strong>{event.vote}</strong> in {event.phase}:{" "}
          <span style={{ color: C.muted }}>{question}</span>
        </span>
      </div>
    );
  }

  if (event.type === "reputation_change") {
    const positive = (event.repChange ?? 0) >= 0;
    return (
      <div style={rowStyle}>
        <span style={timeStyle}>{time}</span>
        <span
          style={{
            ...badgeStyle,
            background: positive ? `${C.green}20` : `${C.red}20`,
            color: positive ? C.green : C.red,
          }}
        >
          {positive ? `+${event.repChange}` : event.repChange} REP
        </span>
        <span style={{ fontSize: 13 }}>
          Voted <strong>{event.vote}</strong>, outcome{" "}
          <strong>{event.outcome}</strong>
          {event.correct ? " (correct)" : " (wrong)"}
        </span>
      </div>
    );
  }

  return null;
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 0",
  borderBottom: `1px solid ${C.cardBorder}`,
};

const timeStyle: React.CSSProperties = {
  fontSize: 11,
  color: C.muted,
  whiteSpace: "nowrap",
  minWidth: 130,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 4,
  whiteSpace: "nowrap",
};
