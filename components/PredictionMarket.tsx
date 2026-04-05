import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import {
  PREDICTION_MARKET_ABI,
  ERC20_ABI,
  Outcome,
} from "@/lib/prediction-market";
import { CONTRACTS } from "@/lib/contracts";

const PM_ADDRESS = CONTRACTS.predictionMarket;
const WLD_ADDRESS = CONTRACTS.wld;
const WORLD_CHAIN_ID = 480;

interface MarketData {
  id: string;
  resolution: { question: string };
}

interface PoolInfo {
  yesPool: bigint;
  noPool: bigint;
  resolved: boolean;
  outcome: number;
}

interface PredictionMarketProps {
  markets: MarketData[];
  selectedMarket: string;
  setSelectedMarket: (id: string) => void;
  pools: Record<string, PoolInfo>;
  wallet: string | null;
  setStatus: (s: string) => void;
  refreshPool: (marketId: string) => void;
  refreshBalance: () => void;
  onBetPlaced?: () => void;
}

// Polling helper for MiniKit transactions
const pollUserOp = async (hash: string) => {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(
      `https://developer.world.org/api/v2/minikit/userop/${hash}`
    );
    const data = await res.json();
    if (data.status === "success") return data;
  }
  return null;
};

export default function PredictionMarket({
  markets,
  selectedMarket,
  setSelectedMarket,
  pools,
  wallet,
  setStatus,
  refreshPool,
  refreshBalance,
  onBetPlaced,
}: PredictionMarketProps) {
  const [betAmount, setBetAmount] = useState("1");

  const handleBet = async (yes: boolean) => {
    if (!MiniKit.isInstalled()) {
      setStatus("Open this app in World App");
      return;
    }
    if (!selectedMarket) {
      setStatus("Select a market first");
      return;
    }

    try {
      const amount = parseUnits(betAmount, 18);
      setStatus(`Approving ${betAmount} WLD + placing bet...`);

      const result = await MiniKit.sendTransaction({
        chainId: WORLD_CHAIN_ID,
        transactions: [
          {
            to: WLD_ADDRESS,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: "approve",
              args: [PM_ADDRESS, amount],
            }),
          },
          {
            to: PM_ADDRESS,
            data: encodeFunctionData({
              abi: PREDICTION_MARKET_ABI,
              functionName: "bet",
              args: [selectedMarket, yes, amount],
            }),
          },
        ],
      });

      if (result.executedWith === "fallback") {
        setStatus("Fallback not supported");
        return;
      }

      setStatus(`Tx submitted: ${result.data.userOpHash.slice(0, 10)}...`);
      const receipt = await pollUserOp(result.data.userOpHash);
      if (receipt) {
        setStatus(`Bet placed! ${betAmount} WLD on ${yes ? "YES" : "NO"}`);
        refreshPool(selectedMarket);
        refreshBalance();
        onBetPlaced?.();
      } else {
        setStatus("Tx may still be pending");
      }
    } catch (err) {
      setStatus(
        `Bet error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleClaim = async () => {
    if (!MiniKit.isInstalled()) {
      setStatus("Open this app in World App");
      return;
    }

    try {
      setStatus("Claiming winnings...");
      const result = await MiniKit.sendTransaction({
        chainId: WORLD_CHAIN_ID,
        transactions: [
          {
            to: PM_ADDRESS,
            data: encodeFunctionData({
              abi: PREDICTION_MARKET_ABI,
              functionName: "claim",
              args: [selectedMarket],
            }),
          },
        ],
      });

      if (result.executedWith === "fallback") {
        setStatus("Fallback not supported");
        return;
      }

      setStatus(`Tx submitted: ${result.data.userOpHash.slice(0, 10)}...`);
      const receipt = await pollUserOp(result.data.userOpHash);
      if (receipt) {
        setStatus("Winnings claimed!");
        refreshPool(selectedMarket);
        refreshBalance();
      } else {
        setStatus("Tx may still be pending");
      }
    } catch (err) {
      setStatus(
        `Claim error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const pool = pools[selectedMarket];
  const totalPool = pool ? pool.yesPool + pool.noPool : 0n;
  const yesOdds =
    totalPool > 0n
      ? (Number((pool!.yesPool * 10000n) / totalPool) / 100).toFixed(1)
      : "50.0";
  const noOdds =
    totalPool > 0n
      ? (100 - Number((pool!.yesPool * 10000n) / totalPool) / 100).toFixed(1)
      : "50.0";

  return (
    <div className="w-full rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Step 3
      </p>
      <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Bet on a prediction market
      </p>

      {/* Market selector */}
      <select
        value={selectedMarket}
        onChange={(e) => setSelectedMarket(e.target.value)}
        className="mb-4 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {markets.map((m) => (
          <option key={m.id} value={m.id}>
            {m.resolution.question.slice(0, 60)}...
          </option>
        ))}
      </select>

      {/* Pool info */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1 rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">YES</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {yesOdds}%
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {totalPool > 0n
              ? parseFloat(formatUnits(pool!.yesPool, 18)).toFixed(2)
              : "0"}{" "}
            WLD
          </p>
        </div>
        <div className="flex-1 rounded-lg bg-red-50 p-3 text-center dark:bg-red-900/20">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">NO</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {noOdds}%
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {totalPool > 0n
              ? parseFloat(formatUnits(pool!.noPool, 18)).toFixed(2)
              : "0"}{" "}
            WLD
          </p>
        </div>
      </div>

      {pool?.resolved && (
        <div className="mb-4 rounded-lg bg-purple-50 px-4 py-2 text-center text-sm font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
          Resolved: {pool.outcome === Outcome.YES ? "YES" : "NO"}
        </div>
      )}

      {/* Bet controls */}
      {!pool?.resolved && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Amount (WLD)
            </label>
            <input
              type="text"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="1.0"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleBet(true)}
              disabled={!wallet}
              className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Bet YES
            </button>
            <button
              onClick={() => handleBet(false)}
              disabled={!wallet}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              Bet NO
            </button>
          </div>
        </>
      )}

      {/* Claim button */}
      {pool?.resolved && (
        <button
          onClick={handleClaim}
          disabled={!wallet}
          className="w-full rounded-xl bg-yellow-500 px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-yellow-600 disabled:opacity-50"
        >
          Claim Winnings
        </button>
      )}
    </div>
  );
}
