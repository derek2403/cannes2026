import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  PREDICTION_MARKET_ABI,
  Outcome,
} from "@/lib/prediction-market";
import { CONTRACTS } from "@/lib/contracts";
import fs from "fs";
import path from "path";

const PREDICTION_MARKET_ADDRESS = CONTRACTS.predictionMarketSepolia;

// ── Types ─────────────────────────────────────────

interface MarketData {
  id: string;
  resolution: { question: string };
  ux: { status: string };
  settlement: { winning_outcome: string | null };
}

interface PoolData {
  yesPool: bigint;
  noPool: bigint;
  resolved: boolean;
  outcome: number;
}

interface PositionData {
  yesAmt: bigint;
  noAmt: bigint;
  hasClaimed: boolean;
}

// ── Colors ────────────────────────────────────────

const C = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  borderLight: "#484f58",
  text: "#e6edf3",
  muted: "#8b949e",
  green: "#3fb950",
  red: "#f85149",
  blue: "#58a6ff",
  yellow: "#d29922",
};

// ── Market Row ────────────────────────────────────

function MarketRow({
  market,
  address,
}: {
  market: MarketData;
  address: `0x${string}` | undefined;
}) {
  const publicClient = usePublicClient({ chainId: 11155111 });
  const { data: walletClient } = useWalletClient({ chainId: 11155111 });

  const [pool, setPool] = useState<PoolData | null>(null);
  const [position, setPosition] = useState<PositionData | null>(null);
  const [betAmount, setBetAmount] = useState("0.001");
  const [loading, setLoading] = useState("");
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    try {
      const p = (await publicClient.readContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "getPool",
        args: [market.id],
      })) as [bigint, bigint, boolean, number];
      setPool({ yesPool: p[0], noPool: p[1], resolved: p[2], outcome: p[3] });

      if (address) {
        const pos = (await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "getPosition",
          args: [market.id, address],
        })) as [bigint, bigint, boolean];
        setPosition({ yesAmt: pos[0], noAmt: pos[1], hasClaimed: pos[2] });
      }
    } catch {
      // contract may not have data for this market yet
    }
  }, [publicClient, market.id, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const placeBet = async (yes: boolean) => {
    if (!walletClient) return;
    setLoading(yes ? "yes" : "no");
    setStatus("");
    try {
      const hash = await walletClient.writeContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "bet",
        args: [market.id, yes],
        value: parseEther(betAmount),
      });
      setStatus(`Tx: ${hash.slice(0, 10)}...`);
      await publicClient!.waitForTransactionReceipt({ hash });
      setStatus("Bet placed!");
      refresh();
    } catch (e) {
      setStatus(`Error: ${(e as Error).message.slice(0, 60)}`);
    }
    setLoading("");
  };

  const resolveMarket = async (outcome: number) => {
    if (!walletClient) return;
    setLoading("resolve");
    setStatus("");
    try {
      const hash = await walletClient.writeContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "resolve",
        args: [market.id, outcome],
      });
      setStatus(`Tx: ${hash.slice(0, 10)}...`);
      await publicClient!.waitForTransactionReceipt({ hash });
      setStatus("Resolved!");
      refresh();
    } catch (e) {
      setStatus(`Error: ${(e as Error).message.slice(0, 60)}`);
    }
    setLoading("");
  };

  const claimWinnings = async () => {
    if (!walletClient) return;
    setLoading("claim");
    setStatus("");
    try {
      const hash = await walletClient.writeContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_ABI,
        functionName: "claim",
        args: [market.id],
      });
      setStatus(`Tx: ${hash.slice(0, 10)}...`);
      await publicClient!.waitForTransactionReceipt({ hash });
      setStatus("Claimed!");
      refresh();
    } catch (e) {
      setStatus(`Error: ${(e as Error).message.slice(0, 60)}`);
    }
    setLoading("");
  };

  const totalPool = pool ? pool.yesPool + pool.noPool : 0n;
  const yesOdds =
    totalPool > 0n
      ? Number((pool!.yesPool * 10000n) / totalPool) / 100
      : 50;
  const noOdds = totalPool > 0n ? 100 - yesOdds : 50;

  const hasWinning =
    pool?.resolved &&
    position &&
    ((pool.outcome === Outcome.YES && position.yesAmt > 0n) ||
      (pool.outcome === Outcome.NO && position.noAmt > 0n));

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {/* Question */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
        {market.resolution.question}
      </div>

      {/* Pool info */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 12,
          fontSize: 13,
          color: C.muted,
        }}
      >
        <span>
          Pool:{" "}
          <span style={{ color: C.text }}>
            {totalPool > 0n ? formatEther(totalPool) : "0"} ETH
          </span>
        </span>
        <span>
          YES: <span style={{ color: C.green }}>{yesOdds.toFixed(1)}%</span>
        </span>
        <span>
          NO: <span style={{ color: C.red }}>{noOdds.toFixed(1)}%</span>
        </span>
        {pool?.resolved && (
          <span
            style={{
              color: pool.outcome === Outcome.YES ? C.green : C.red,
              fontWeight: 700,
            }}
          >
            Resolved: {pool.outcome === Outcome.YES ? "YES" : "NO"}
          </span>
        )}
      </div>

      {/* Your position */}
      {position && (position.yesAmt > 0n || position.noAmt > 0n) && (
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            marginBottom: 12,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}
        >
          Your position — YES:{" "}
          <span style={{ color: C.green }}>
            {formatEther(position.yesAmt)} ETH
          </span>
          {" | "}NO:{" "}
          <span style={{ color: C.red }}>
            {formatEther(position.noAmt)} ETH
          </span>
          {position.hasClaimed && (
            <span style={{ color: C.yellow, marginLeft: 8 }}>
              (Claimed)
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {address && !pool?.resolved && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            type="text"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="ETH"
            style={{
              width: 90,
              padding: "8px 10px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: "rgba(255,255,255,0.05)",
              color: C.text,
              fontSize: 13,
            }}
          />
          <button
            onClick={() => placeBet(true)}
            disabled={!!loading}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: C.green,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading === "yes" ? "..." : "Bet YES"}
          </button>
          <button
            onClick={() => placeBet(false)}
            disabled={!!loading}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: C.red,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading === "no" ? "..." : "Bet NO"}
          </button>

          {/* Resolve buttons */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
            }}
          >
            <button
              onClick={() => resolveMarket(Outcome.YES)}
              disabled={!!loading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.muted,
                fontSize: 12,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              Resolve YES
            </button>
            <button
              onClick={() => resolveMarket(Outcome.NO)}
              disabled={!!loading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.muted,
                fontSize: 12,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              Resolve NO
            </button>
          </div>
        </div>
      )}

      {/* Claim */}
      {pool?.resolved && hasWinning && !position?.hasClaimed && (
        <button
          onClick={claimWinnings}
          disabled={!!loading}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            border: "none",
            background: C.yellow,
            color: "#000",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading === "claim" ? "Claiming..." : "Claim Winnings"}
        </button>
      )}

      {/* Status */}
      {status && (
        <div style={{ fontSize: 12, color: C.yellow, marginTop: 8 }}>
          {status}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────

export default function BettingPage({
  markets,
}: {
  markets: MarketData[];
}) {
  const { address, isConnected } = useAccount();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>
            <span style={{ color: C.blue }}>Prediction</span>Market
          </span>
          <span
            style={{
              fontSize: 11,
              color: C.muted,
              background: "rgba(255,255,255,0.05)",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            Sepolia
          </span>
        </div>
        <ConnectButton />
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Betting
          </h1>
          <span style={{ fontSize: 13, color: C.muted }}>
            Contract:{" "}
            <span style={{ fontFamily: "monospace" }}>
              {PREDICTION_MARKET_ADDRESS?.slice(0, 6)}...
              {PREDICTION_MARKET_ADDRESS?.slice(-4)}
            </span>
          </span>
        </div>

        {!isConnected && (
          <div
            style={{
              padding: 20,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              textAlign: "center",
              color: C.muted,
              marginBottom: 16,
            }}
          >
            Connect your wallet on Sepolia to place bets
          </div>
        )}

        {markets.map((m) => (
          <MarketRow key={m.id} market={m} address={address} />
        ))}
      </div>
    </div>
  );
}

// ── Server-side ───────────────────────────────────

export async function getServerSideProps() {
  const marketsPath = path.join(process.cwd(), "data", "markets.json");
  let raw: MarketData[] = [];

  if (fs.existsSync(marketsPath)) {
    try {
      raw = JSON.parse(fs.readFileSync(marketsPath, "utf-8"));
    } catch {
      raw = [];
    }
  }

  // Only pass the fields the page needs
  const markets = raw.map((m) => ({
    id: m.id,
    resolution: { question: m.resolution.question },
    ux: { status: m.ux.status },
    settlement: { winning_outcome: m.settlement.winning_outcome },
  }));

  return { props: { markets } };
}
