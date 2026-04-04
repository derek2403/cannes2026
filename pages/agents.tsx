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

// ── Colors ──────────────────────────────────────────────────────
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
};

// ═════════════════════════════════════════════════════════════════
export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [registryTopicId, setRegistryTopicId] = useState<string | null>(null);
  const [reputationTopicId, setReputationTopicId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    try {
      const [stateRes, histRes] = await Promise.all([
        fetch("/api/agents/state"),
        fetch("/api/agents/history"),
      ]);
      if (stateRes.ok) {
        const data = await stateRes.json();
        setAgents(data.agents || []);
        setRegistryTopicId(data.registryTopicId || null);
        setReputationTopicId(data.reputationTopicId || null);
      }
      if (histRes.ok) {
        const data = await histRes.json();
        setHistory(data.events || []);
      }
    } catch {
      /* silent */
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute per-agent stats
  function agentStats(name: string) {
    const events = history.filter((e) => e.agentName === name);
    const marketsCreated = events.filter(
      (e) => e.type === "market_created"
    );
    const disputeVotes = events.filter((e) => e.type === "dispute_vote");
    const repChanges = events.filter((e) => e.type === "reputation_change");
    const correctVotes = repChanges.filter((e) => e.correct === true).length;
    const wrongVotes = repChanges.filter((e) => e.correct === false).length;
    const totalResolved = correctVotes + wrongVotes;
    const accuracy =
      totalResolved > 0
        ? Math.round((correctVotes / totalResolved) * 100)
        : null;

    return {
      marketsCreated,
      disputeVotes,
      repChanges,
      correctVotes,
      wrongVotes,
      accuracy,
    };
  }

  const mintedAgents = agents.filter((a) => a.inftTokenId != null);

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
          <span
            style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            Agents
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
            {mintedAgents.length} active
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={refresh}
            disabled={refreshing}
            style={{
              background: "none",
              border: `1px solid ${C.cardBorder}`,
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              color: C.muted,
              cursor: refreshing ? "wait" : "pointer",
            }}
          >
            {refreshing ? "..." : "Refresh"}
          </button>
          <a
            href="/dashboard"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              background: C.btnPrimary,
              color: "#fff",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Dashboard
          </a>
          <a
            href="/polymarket"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              background: C.btnPrimary,
              color: "#fff",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Markets
          </a>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
        {/* Global info bar */}
        {(registryTopicId || reputationTopicId) && (
          <div
            style={{
              display: "flex",
              gap: 24,
              marginBottom: 24,
              padding: 16,
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            {registryTopicId && (
              <div>
                <span style={{ color: C.muted }}>HCS-2 Registry: </span>
                <a
                  href={`https://hashscan.io/testnet/topic/${registryTopicId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: C.green, textDecoration: "none" }}
                >
                  {registryTopicId}
                </a>
              </div>
            )}
            {reputationTopicId && (
              <div>
                <span style={{ color: C.muted }}>HCS-20 Reputation: </span>
                <a
                  href={`https://hashscan.io/testnet/topic/${reputationTopicId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: C.green, textDecoration: "none" }}
                >
                  {reputationTopicId}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Agent cards */}
        {mintedAgents.length === 0 && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              borderRadius: 12,
              color: C.muted,
            }}
          >
            <p style={{ fontSize: 16, marginBottom: 8 }}>No minted agents yet.</p>
            <p style={{ fontSize: 13 }}>
              Use <code style={{ background: C.bg, padding: "2px 6px", borderRadius: 4 }}>
                POST /api/commands/create-agent
              </code>{" "}
              or the <a href="/dashboard" style={{ color: C.green }}>Dashboard</a>.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mintedAgents.map((agent) => {
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
                {/* Main card row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto auto auto",
                    alignItems: "center",
                    gap: 24,
                    padding: "16px 20px",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setExpandedAgent(isExpanded ? null : agent.displayName)
                  }
                >
                  {/* Name + ID */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {agent.displayName}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 2,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: C.muted }}>
                        iNFT #{agent.inftTokenId}
                      </span>
                      {agent.accountId && (
                        <a
                          href={`https://hashscan.io/testnet/account/${agent.accountId}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: C.green, textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {agent.accountId}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Reputation */}
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: C.orange,
                      }}
                    >
                      {agent.reputation ?? 10}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>REP</div>
                  </div>

                  {/* Markets created */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
                      {stats.marketsCreated.length}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>Markets</div>
                  </div>

                  {/* Disputes */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
                      {stats.repChanges.length}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>Disputes</div>
                  </div>

                  {/* Accuracy */}
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color:
                          stats.accuracy === null
                            ? C.muted
                            : stats.accuracy >= 70
                              ? C.green
                              : stats.accuracy >= 40
                                ? C.orange
                                : C.red,
                      }}
                    >
                      {stats.accuracy !== null ? `${stats.accuracy}%` : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>Accuracy</div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: `1px solid ${C.cardBorder}`,
                      padding: 20,
                    }}
                  >
                    {/* Agent info row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                        marginBottom: 20,
                      }}
                    >
                      <InfoBlock title="Identity">
                        <InfoRow label="Model" value={
                          agent.modelProvider === "0g-compute"
                            ? "0G Compute (TEE)"
                            : agent.modelProvider || agent.model || "—"
                        } />
                        <InfoRow label="Domain" value={agent.domainTags || "—"} />
                        <InfoRow label="Services" value={agent.serviceOfferings || "—"} />
                        {agent.profileTopicId && (
                          <InfoRow
                            label="HCS-11"
                            value={agent.profileTopicId}
                            link={`https://hashscan.io/testnet/topic/${agent.profileTopicId}`}
                          />
                        )}
                      </InfoBlock>
                      <InfoBlock title="Reputation Breakdown">
                        <InfoRow
                          label="Correct votes"
                          value={`${stats.correctVotes}`}
                          color={C.green}
                        />
                        <InfoRow
                          label="Wrong votes"
                          value={`${stats.wrongVotes}`}
                          color={C.red}
                        />
                        <InfoRow
                          label="Total resolved"
                          value={`${stats.correctVotes + stats.wrongVotes}`}
                        />
                        <InfoRow
                          label="Markets proposed"
                          value={`${stats.marketsCreated.filter((e) => e.role === "proposer").length}`}
                        />
                      </InfoBlock>
                    </div>

                    {/* History timeline */}
                    <div>
                      <h4
                        style={{
                          margin: "0 0 12px",
                          fontSize: 13,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: C.muted,
                        }}
                      >
                        Activity History
                      </h4>
                      {[...stats.marketsCreated, ...stats.disputeVotes, ...stats.repChanges]
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                        )
                        .slice(0, 20)
                        .map((event, i) => (
                          <HistoryRow key={i} event={event} />
                        ))}
                      {stats.marketsCreated.length === 0 &&
                        stats.disputeVotes.length === 0 &&
                        stats.repChanges.length === 0 && (
                          <div
                            style={{
                              fontSize: 13,
                              color: C.muted,
                              padding: "8px 0",
                            }}
                          >
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

        {/* API Reference */}
        <div
          style={{
            marginTop: 40,
            padding: 20,
            background: C.card,
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 12,
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>
            Command API
          </h3>
          <div
            style={{ fontSize: 12, fontFamily: "monospace", lineHeight: 2 }}
          >
            <div>
              <span style={{ color: C.green, fontWeight: 600 }}>POST</span>{" "}
              /api/commands/create-agent{" "}
              <span style={{ color: C.muted }}>— mint agent iNFT + Hedera identity</span>
            </div>
            <div>
              <span style={{ color: C.green, fontWeight: 600 }}>POST</span>{" "}
              /api/commands/create-market{" "}
              <span style={{ color: C.muted }}>— swarm proposes + votes on market</span>
            </div>
            <div>
              <span style={{ color: C.orange, fontWeight: 600 }}>POST</span>{" "}
              /api/commands/resolve-1{" "}
              <span style={{ color: C.muted }}>
                — select committee by reputation, independent vote
              </span>
            </div>
            <div>
              <span style={{ color: C.orange, fontWeight: 600 }}>POST</span>{" "}
              /api/commands/resolve-2{" "}
              <span style={{ color: C.muted }}>
                — discussion round, rep update on resolution
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
//  SUB COMPONENTS
// ═════════════════════════════════════════════════════════════════

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
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

function InfoRow({
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
        <span style={{ color: color || C.text, fontWeight: 500 }}>
          {value}
        </span>
      )}
    </div>
  );
}

function HistoryRow({ event }: { event: HistoryEvent }) {
  const time = new Date(event.timestamp).toLocaleString();
  const question =
    event.marketQuestion && event.marketQuestion.length > 60
      ? event.marketQuestion.slice(0, 60) + "..."
      : event.marketQuestion || event.marketId;

  if (event.type === "market_created") {
    return (
      <div style={rowStyle}>
        <span style={timeStyle}>{time}</span>
        <span style={{ ...badgeStyle, background: `${C.green}20`, color: C.green }}>
          MARKET
        </span>
        <span style={{ fontSize: 13 }}>
          {event.role === "proposer" ? "Proposed" : "Participated in"} market:{" "}
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
          Voted <strong>{event.vote}</strong>, outcome was{" "}
          <strong>{event.outcome}</strong>
          {event.correct ? " (correct)" : " (wrong)"}:{" "}
          <span style={{ color: C.muted }}>{question}</span>
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
  minWidth: 140,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 4,
  whiteSpace: "nowrap",
};
