import { useState, useEffect, useRef, useCallback } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { useAccount } from "wagmi";
import fs from "fs";
import path from "path";

// ── Types ──────────────────────────────────────────

interface Market {
  id: string;
  created_at: string;
  ai_insight: {
    market_thesis: string;
    confidence_score: number;
    suggested_categories: string[];
  };
  resolution: {
    question: string;
    resolution_criteria: string;
    resolution_date: string;
    oracle_type: string;
  };
  amm: {
    yes_token_id: string;
    no_token_id: string;
    current_odds_yes: number;
    trading_fee: number;
  };
  ux: {
    status: string;
    total_volume: number;
    unique_bettors: number;
    is_trending: boolean;
  };
  settlement: {
    winning_outcome: string | null;
    settlement_price: number | null;
    dispute_tx_hash: string | null;
  };
}

interface DisputeEvent {
  ts: string;
  phase: string;
  type: string;
  agent: string;
  message: string;
  data: Record<string, unknown>;
}

// ── Colors ─────────────────────────────────────────

const C = {
  bg: "#0d1117",
  surface: "#161b22",
  surfaceHover: "#1c2129",
  border: "#30363d",
  borderLight: "#484f58",
  text: "#e6edf3",
  textMuted: "#8b949e",
  textDim: "#484f58",
  green: "#3fb950",
  greenDim: "#238636",
  red: "#f85149",
  redDim: "#da3633",
  blue: "#58a6ff",
  yellow: "#d29922",
  purple: "#bc8cff",
  cyan: "#39d2c0",
  orange: "#f0883e",
};

// ── Styles ─────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: C.bg,
  color: C.text,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
};

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderBottom: `1px solid ${C.border}`,
  background: C.surface,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "24px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 20,
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
};

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const btnPrimary: React.CSSProperties = {
  background: C.blue,
  color: "#fff",
  border: "none",
  padding: "10px 24px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  background: C.redDim,
  color: "#fff",
  border: "none",
  padding: "10px 24px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const terminalStyle: React.CSSProperties = {
  background: "#010409",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
  fontSize: "0.78rem",
  lineHeight: 1.6,
  padding: 16,
  overflowY: "auto" as const,
  height: 420,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalBox: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 32,
  maxWidth: 520,
  width: "90%",
  maxHeight: "80vh",
  overflowY: "auto" as const,
};

// ── Helper Components ──────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    PROPOSED: { bg: "rgba(88,166,255,0.15)", color: C.blue },
    ACTIVE: { bg: "rgba(63,185,80,0.15)", color: C.green },
    RESOLVED: { bg: "rgba(188,140,255,0.15)", color: C.purple },
    DISPUTED: { bg: "rgba(248,81,73,0.15)", color: C.red },
  };
  const c = colors[status] || colors.PROPOSED;
  return (
    <span style={{ ...badgeBase, background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return null;
  const isYes = outcome === "YES";
  return (
    <span
      style={{
        ...badgeBase,
        background: isYes
          ? "rgba(63,185,80,0.15)"
          : "rgba(248,81,73,0.15)",
        color: isYes ? C.green : C.red,
      }}
    >
      {outcome}
    </span>
  );
}

// ── Phase Timeline Component ───────────────────────

const PHASES = [
  { key: "init", label: "Initialize" },
  { key: "evidence", label: "Evidence" },
  { key: "commit", label: "Commit" },
  { key: "reveal", label: "Reveal" },
  { key: "tally", label: "Tally" },
  { key: "discussion", label: "Discussion" },
  { key: "resolve", label: "Resolve" },
];

function PhaseTimeline({
  currentPhase,
  completedPhases,
}: {
  currentPhase: string;
  completedPhases: Set<string>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          color: C.textMuted,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        Phases
      </div>
      {PHASES.map(({ key, label }) => {
        const isComplete = completedPhases.has(key);
        const isActive = currentPhase === key;
        const isPending = !isComplete && !isActive;

        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 0",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                background: isComplete
                  ? C.greenDim
                  : isActive
                    ? C.blue
                    : C.textDim,
                color: "#fff",
                animation: isActive ? "pulse 1.5s infinite" : undefined,
              }}
            >
              {isComplete ? "\u2713" : isActive ? "\u25CF" : "\u25CB"}
            </div>
            <span
              style={{
                fontSize: 13,
                color: isPending ? C.textDim : C.text,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Terminal Log Component ─────────────────────────

function TerminalLog({ events }: { events: DisputeEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const colorMap: Record<string, string> = {
    info: C.textMuted,
    agent: C.cyan,
    vote: C.yellow,
    result: C.green,
    error: C.red,
  };

  return (
    <div ref={scrollRef} style={terminalStyle}>
      {events.length === 0 && (
        <div style={{ color: C.textDim }}>
          Waiting for dispute to start...
        </div>
      )}
      {events.map((evt, idx) => {
        const time = evt.ts.split("T")[1]?.replace("Z", "") || "";
        const color = colorMap[evt.type] || C.textMuted;
        return (
          <div key={idx} style={{ color, marginBottom: 2 }}>
            <span style={{ color: C.textDim }}>[{time}]</span>{" "}
            <span style={{ color: C.purple, fontWeight: 600 }}>
              {evt.agent}
            </span>
            : {evt.message}
          </div>
        );
      })}
    </div>
  );
}

// ── Vote Results Component ─────────────────────────

function VoteResults({
  tally,
}: {
  tally: { YES: number; NO: number; UNSURE: number };
}) {
  const total = tally.YES + tally.NO + tally.UNSURE || 1;
  const bars = [
    { label: "YES", count: tally.YES, color: C.green },
    { label: "NO", count: tally.NO, color: C.red },
    { label: "UNSURE", count: tally.UNSURE, color: C.yellow },
  ];

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 16,
        marginTop: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          color: C.textMuted,
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        Vote Results
      </div>
      {bars.map(({ label, count, color }) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
          >
            <span
              style={{
                width: 52,
                fontSize: 12,
                fontWeight: 600,
                color,
              }}
            >
              {label}
            </span>
            <div
              style={{
                flex: 1,
                height: 16,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 4,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <span
              style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, width: 36 }}
            >
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Market Card ────────────────────────────────────

function MarketCard({
  market,
  onClick,
}: {
  market: Market;
  onClick: () => void;
}) {
  const yesOdds = Math.round((market.amm.current_odds_yes || 0.5) * 100);
  const noOdds = 100 - yesOdds;

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.borderLight;
        e.currentTarget.style.background = C.surfaceHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.background = C.surface;
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          marginBottom: 12,
        }}
      >
        <StatusBadge status={market.ux.status} />
        {market.settlement.winning_outcome && (
          <OutcomeBadge outcome={market.settlement.winning_outcome} />
        )}
      </div>
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.4,
          margin: "0 0 16px",
          color: C.text,
        }}
      >
        {market.resolution.question}
      </h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div
          style={{
            flex: 1,
            background: "rgba(63,185,80,0.1)",
            border: `1px solid ${C.greenDim}`,
            borderRadius: 8,
            padding: "8px 12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>
            Yes
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>
            {yesOdds}\u00A2
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: "rgba(248,81,73,0.1)",
            border: `1px solid ${C.redDim}`,
            borderRadius: 8,
            padding: "8px 12px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>
            No
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.red }}>
            {noOdds}\u00A2
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: C.textMuted,
        }}
      >
        <span>Vol: ${market.ux.total_volume}</span>
        <span>
          {market.ai_insight.suggested_categories?.join(", ") || "General"}
        </span>
      </div>
    </div>
  );
}

// ── Market Detail Modal ────────────────────────────

function MarketModal({
  market,
  onClose,
  onDispute,
  isConnected,
}: {
  market: Market;
  onClose: () => void;
  onDispute: () => void;
  isConnected: boolean;
}) {
  const canDispute =
    market.ux.status === "RESOLVED" || market.settlement.winning_outcome;

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <StatusBadge status={market.ux.status} />
            {market.settlement.winning_outcome && (
              <OutcomeBadge outcome={market.settlement.winning_outcome} />
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            \u2715
          </button>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px", lineHeight: 1.4 }}>
          {market.resolution.question}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              color: C.textMuted,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            Resolution Criteria
          </div>
          <div
            style={{
              fontSize: 13,
              color: C.textMuted,
              lineHeight: 1.5,
              background: "rgba(255,255,255,0.03)",
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}
          >
            {market.resolution.resolution_criteria}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Resolution Date
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {market.resolution.resolution_date}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Oracle Type</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {market.resolution.oracle_type}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted }}>Confidence</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {market.ai_insight.confidence_score}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Current Outcome
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {market.settlement.winning_outcome || "Pending"}
            </div>
          </div>
        </div>

        {market.settlement.dispute_tx_hash && (
          <div
            style={{
              fontSize: 12,
              color: C.yellow,
              marginBottom: 16,
              padding: "8px 12px",
              background: "rgba(210,153,34,0.1)",
              borderRadius: 6,
              border: `1px solid rgba(210,153,34,0.2)`,
            }}
          >
            This market was previously disputed: {market.settlement.dispute_tx_hash}
          </div>
        )}

        {canDispute && (
          <div style={{ marginTop: 8 }}>
            {!isConnected ? (
              <div style={{ fontSize: 13, color: C.textMuted }}>
                Connect your wallet to dispute this market.
              </div>
            ) : (
              <button style={btnDanger} onClick={onDispute}>
                Dispute This Outcome
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bond Modal ─────────────────────────────────────

function BondModal({
  market,
  onClose,
  onConfirm,
  loading,
}: {
  market: Market;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [bondAmt, setBondAmt] = useState("0.01");

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div
        style={{ ...modalBox, maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>
          Deposit Dispute Bond
        </h3>
        <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 16px", lineHeight: 1.5 }}>
          To dispute &ldquo;{market.resolution.question.slice(0, 60)}...&rdquo;,
          deposit a bond. If the dispute succeeds, you get it back. If not, the
          bond is forfeited.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              color: C.textMuted,
              display: "block",
              marginBottom: 4,
            }}
          >
            Bond Amount (0G Testnet)
          </label>
          <input
            type="text"
            value={bondAmt}
            onChange={(e) => setBondAmt(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: "rgba(255,255,255,0.05)",
              color: C.text,
              fontSize: 14,
              fontFamily: "monospace",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Starting Dispute..." : "Confirm & Start Dispute"}
          </button>
          <button
            style={{
              ...btnPrimary,
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.textMuted,
            }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dispute Dashboard ──────────────────────────────

function DisputeDashboard({
  events,
  currentPhase,
  completedPhases,
  voteTally,
  done,
}: {
  events: DisputeEvent[];
  currentPhase: string;
  completedPhases: Set<string>;
  voteTally: { YES: number; NO: number; UNSURE: number };
  done: boolean;
}) {
  const finalEvent = events.find(
    (e) => e.phase === "resolve" && e.type === "result"
  );

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          Live Dispute Resolution
        </h2>
        {done ? (
          <span
            style={{
              ...badgeBase,
              background: "rgba(63,185,80,0.15)",
              color: C.green,
            }}
          >
            COMPLETE
          </span>
        ) : (
          <span
            style={{
              ...badgeBase,
              background: "rgba(88,166,255,0.15)",
              color: C.blue,
            }}
          >
            IN PROGRESS
          </span>
        )}
      </div>

      {finalEvent && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            background:
              (finalEvent.data as Record<string, string>).action === "OVERTURNED"
                ? "rgba(248,81,73,0.1)"
                : "rgba(63,185,80,0.1)",
            border: `1px solid ${
              (finalEvent.data as Record<string, string>).action === "OVERTURNED"
                ? "rgba(248,81,73,0.2)"
                : "rgba(63,185,80,0.2)"
            }`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            Dispute{" "}
            {(finalEvent.data as Record<string, string>).action === "OVERTURNED"
              ? "Accepted"
              : "Rejected"}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            Outcome: {(finalEvent.data as Record<string, string>).winningOutcome}{" "}
            (was: {(finalEvent.data as Record<string, string>).previousOutcome})
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ width: 160, flexShrink: 0 }}>
          <PhaseTimeline
            currentPhase={currentPhase}
            completedPhases={completedPhases}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TerminalLog events={events} />
        </div>
      </div>

      {(voteTally.YES > 0 || voteTally.NO > 0 || voteTally.UNSURE > 0) && (
        <VoteResults tally={voteTally} />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────

export default function PolymarketPage({
  initialMarkets,
}: {
  initialMarkets: Market[];
}) {
  const { isConnected } = useAccount();
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showBond, setShowBond] = useState(false);
  const [disputeLoading, setDisputeLoading] = useState(false);

  // Dispute state
  const [disputeActive, setDisputeActive] = useState(false);
  const [disputeMarketId, setDisputeMarketId] = useState<string | null>(null);
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState(false);
  const [currentPhase, setCurrentPhase] = useState("idle");
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(
    new Set()
  );
  const [voteTally, setVoteTally] = useState({ YES: 0, NO: 0, UNSURE: 0 });

  // Refresh markets from server
  const loadMarkets = useCallback(async () => {
    try {
      const marketsRes = await fetch("/polymarket");
      const html = await marketsRes.text();
      const match = html.match(
        /__NEXT_DATA__[^>]*>([^<]+)<\/script>/
      );
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          if (data.props?.pageProps?.initialMarkets) {
            setMarkets(data.props.pageProps.initialMarkets);
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Start dispute
  const startDispute = async () => {
    if (!selectedMarket) return;
    setDisputeLoading(true);
    try {
      const res = await fetch("/api/dispute/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId: selectedMarket.id }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      setDisputeActive(true);
      setDisputeMarketId(selectedMarket.id);
      setEvents([]);
      setCursor(0);
      setDone(false);
      setCurrentPhase("init");
      setCompletedPhases(new Set());
      setVoteTally({ YES: 0, NO: 0, UNSURE: 0 });
      setShowBond(false);
      setSelectedMarket(null);
    } catch (e) {
      alert("Failed to start dispute: " + (e as Error).message);
    } finally {
      setDisputeLoading(false);
    }
  };

  // Poll events
  useEffect(() => {
    if (!disputeActive || done || !disputeMarketId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dispute/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketId: disputeMarketId, cursor }),
        });
        const data = await res.json();

        if (data.events && data.events.length > 0) {
          setEvents((prev) => [...prev, ...data.events]);
          setCursor(data.cursor);

          // Track phases
          const newCompleted = new Set(completedPhases);
          let latestPhase = currentPhase;

          for (const evt of data.events as DisputeEvent[]) {
            if (evt.phase !== "done" && evt.phase !== "error") {
              // When a new phase starts, mark previous as complete
              if (evt.phase !== latestPhase && latestPhase !== "idle") {
                newCompleted.add(latestPhase);
              }
              latestPhase = evt.phase;
            }

            // Extract vote tallies from reveal results
            if (
              evt.phase === "reveal" &&
              evt.type === "result" &&
              evt.data
            ) {
              const d = evt.data as Record<string, number>;
              if (d.YES !== undefined) {
                setVoteTally({ YES: d.YES, NO: d.NO, UNSURE: d.UNSURE || 0 });
              }
            }

            // Also check tally events
            if (evt.phase === "tally" && evt.type === "result" && evt.data) {
              const tallyData = (evt.data as Record<string, unknown>)
                .tally as Record<string, number> | undefined;
              if (tallyData) {
                setVoteTally({
                  YES: tallyData.YES || 0,
                  NO: tallyData.NO || 0,
                  UNSURE: tallyData.UNSURE || 0,
                });
              }
            }
          }

          setCurrentPhase(latestPhase);
          setCompletedPhases(newCompleted);
        }

        if (data.done) {
          setDone(true);
          // Mark all phases complete
          setCompletedPhases(new Set(PHASES.map((p) => p.key)));
          loadMarkets();
        }
      } catch {
        // Silently retry
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [disputeActive, done, disputeMarketId, cursor, currentPhase, completedPhases, loadMarkets]);

  return (
    <div style={pageStyle}>
      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Nav */}
      <nav style={navStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>
            <span style={{ color: C.blue }}>Prediction</span>Market
          </span>
          <span
            style={{
              fontSize: 11,
              color: C.textMuted,
              background: "rgba(255,255,255,0.05)",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            Testnet
          </span>
        </div>
        <ConnectWallet />
      </nav>

      {/* Content */}
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Markets</h1>
          <span style={{ fontSize: 13, color: C.textMuted }}>
            {markets.length} markets
          </span>
        </div>

        {/* Market Grid */}
        <div style={gridStyle}>
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onClick={() => setSelectedMarket(market)}
            />
          ))}
        </div>

        {/* Dispute Dashboard */}
        {disputeActive && (
          <DisputeDashboard
            events={events}
            currentPhase={currentPhase}
            completedPhases={completedPhases}
            voteTally={voteTally}
            done={done}
          />
        )}
      </div>

      {/* Modals */}
      {selectedMarket && !showBond && (
        <MarketModal
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
          onDispute={() => setShowBond(true)}
          isConnected={isConnected}
        />
      )}

      {showBond && selectedMarket && (
        <BondModal
          market={selectedMarket}
          onClose={() => {
            setShowBond(false);
            setSelectedMarket(null);
          }}
          onConfirm={startDispute}
          loading={disputeLoading}
        />
      )}
    </div>
  );
}

// ── Server-Side Data Loading ───────────────────────

export async function getServerSideProps() {
  const marketsPath = path.join(process.cwd(), "data", "markets.json");
  let markets: Market[] = [];

  if (fs.existsSync(marketsPath)) {
    try {
      markets = JSON.parse(fs.readFileSync(marketsPath, "utf-8"));
    } catch {
      markets = [];
    }
  }

  return {
    props: {
      initialMarkets: markets,
    },
  };
}
