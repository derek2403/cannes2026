import { useState, useEffect, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import {
  encodeFunctionData,
  createPublicClient,
  http,
  formatUnits,
} from "viem";
import {
  PREDICTION_MARKET_ABI,
  Outcome,
} from "@/lib/prediction-market";
import { CONTRACTS } from "@/lib/contracts";

const PM_ADDRESS = CONTRACTS.predictionMarket;
const WORLD_CHAIN_ID = 480;

const client = createPublicClient({
  chain: {
    id: WORLD_CHAIN_ID,
    name: "World Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: {
        http: ["https://worldchain-mainnet.g.alchemy.com/public"],
      },
    },
  },
  transport: http(),
});

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

interface PositionInfo {
  yesAmt: bigint;
  noAmt: bigint;
  hasClaimed: boolean;
}

interface MyPositionsProps {
  markets: MarketData[];
  pools: Record<string, PoolInfo>;
  wallet: string;
  setStatus: (s: string) => void;
  refreshPool: (marketId: string) => void;
  refreshBalance: () => void;
}

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

export default function MyPositions({
  markets,
  pools,
  wallet,
  setStatus,
  refreshPool,
  refreshBalance,
}: MyPositionsProps) {
  const [positions, setPositions] = useState<Record<string, PositionInfo>>({});
  const [resolveOutcomes, setResolveOutcomes] = useState<Record<string, number>>({});
  const [disputeOutcomes, setDisputeOutcomes] = useState<Record<string, number>>({});

  const refreshPositions = useCallback(async () => {
    const results: Record<string, PositionInfo> = {};
    await Promise.all(
      markets.map(async (m) => {
        try {
          const result = (await client.readContract({
            address: PM_ADDRESS,
            abi: PREDICTION_MARKET_ABI,
            functionName: "getPosition",
            args: [m.id, wallet as `0x${string}`],
          })) as [bigint, bigint, boolean];
          if (result[0] > 0n || result[1] > 0n) {
            results[m.id] = {
              yesAmt: result[0],
              noAmt: result[1],
              hasClaimed: result[2],
            };
          }
        } catch {
          // no position
        }
      })
    );
    setPositions(results);
  }, [markets, wallet]);

  useEffect(() => {
    refreshPositions();
  }, [refreshPositions]);

  const handleResolve = async (marketId: string) => {
    if (!MiniKit.isInstalled()) {
      setStatus("Open this app in World App");
      return;
    }

    const outcome = resolveOutcomes[marketId] ?? Outcome.YES;

    try {
      setStatus(`Resolving as ${outcome === Outcome.YES ? "YES" : "NO"}...`);
      const result = await MiniKit.sendTransaction({
        chainId: WORLD_CHAIN_ID,
        transactions: [
          {
            to: PM_ADDRESS,
            data: encodeFunctionData({
              abi: PREDICTION_MARKET_ABI,
              functionName: "resolve",
              args: [marketId, outcome],
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
        setStatus(`Market resolved as ${outcome === Outcome.YES ? "YES" : "NO"}!`);
        refreshPool(marketId);
        refreshPositions();
      } else {
        setStatus("Tx may still be pending");
      }
    } catch (err) {
      setStatus(
        `Resolve error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleDispute = async (marketId: string) => {
    if (!MiniKit.isInstalled()) {
      setStatus("Open this app in World App");
      return;
    }

    const newOutcome = disputeOutcomes[marketId] ?? Outcome.YES;

    try {
      setStatus(`Disputing → ${newOutcome === Outcome.YES ? "YES" : "NO"}...`);
      const result = await MiniKit.sendTransaction({
        chainId: WORLD_CHAIN_ID,
        transactions: [
          {
            to: PM_ADDRESS,
            data: encodeFunctionData({
              abi: PREDICTION_MARKET_ABI,
              functionName: "dispute",
              args: [marketId, newOutcome],
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
        setStatus(`Market disputed → ${newOutcome === Outcome.YES ? "YES" : "NO"}!`);
        refreshPool(marketId);
        refreshPositions();
      } else {
        setStatus("Tx may still be pending");
      }
    } catch (err) {
      setStatus(
        `Dispute error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleClaim = async (marketId: string) => {
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
              args: [marketId],
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
        refreshPool(marketId);
        refreshBalance();
        refreshPositions();
      } else {
        setStatus("Tx may still be pending");
      }
    } catch (err) {
      setStatus(
        `Claim error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const marketIds = Object.keys(positions);

  return (
    <div className="w-full rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        My Positions
      </p>
      <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Your bets across all markets
      </p>

      {marketIds.length === 0 && (
        <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
          No positions yet
        </p>
      )}

      <div className="flex flex-col gap-4">
        {marketIds.map((marketId) => {
          const pos = positions[marketId];
          const pool = pools[marketId];
          const market = markets.find((m) => m.id === marketId);
          const question = market?.resolution.question ?? marketId;
          const isResolved = pool?.resolved ?? false;
          const outcomeLabel =
            pool?.outcome === Outcome.YES ? "YES" : pool?.outcome === Outcome.NO ? "NO" : "—";

          return (
            <div
              key={marketId}
              className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              {/* Question */}
              <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {question.length > 80 ? `${question.slice(0, 80)}...` : question}
              </p>

              {/* Position amounts */}
              <div className="mb-3 flex gap-2">
                {pos.yesAmt > 0n && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    YES {parseFloat(formatUnits(pos.yesAmt, 18)).toFixed(2)} WLD
                  </span>
                )}
                {pos.noAmt > 0n && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    NO {parseFloat(formatUnits(pos.noAmt, 18)).toFixed(2)} WLD
                  </span>
                )}
              </div>

              {/* Resolved badge or resolve controls */}
              {isResolved ? (
                <div className="mb-3">
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    Resolved: {outcomeLabel}
                  </span>
                </div>
              ) : (
                <div className="mb-3 flex items-center gap-2">
                  <select
                    value={resolveOutcomes[marketId] ?? Outcome.YES}
                    onChange={(e) =>
                      setResolveOutcomes((prev) => ({
                        ...prev,
                        [marketId]: Number(e.target.value),
                      }))
                    }
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value={Outcome.YES}>YES</option>
                    <option value={Outcome.NO}>NO</option>
                  </select>
                  <button
                    onClick={() => handleResolve(marketId)}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                  >
                    Resolve
                  </button>
                </div>
              )}

              {/* Claim button */}
              {isResolved && !pos.hasClaimed && (
                <button
                  onClick={() => handleClaim(marketId)}
                  className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-xs font-medium text-black transition-colors hover:bg-yellow-600"
                >
                  Claim Winnings
                </button>
              )}

              {/* Already claimed */}
              {isResolved && pos.hasClaimed && (
                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Winnings claimed
                </p>
              )}

              {/* Dispute button */}
              {isResolved && (
                <div className="mt-3 flex items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <select
                    value={disputeOutcomes[marketId] ?? (pool?.outcome === Outcome.YES ? Outcome.NO : Outcome.YES)}
                    onChange={(e) =>
                      setDisputeOutcomes((prev) => ({
                        ...prev,
                        [marketId]: Number(e.target.value),
                      }))
                    }
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value={Outcome.YES}>YES</option>
                    <option value={Outcome.NO}>NO</option>
                  </select>
                  <button
                    onClick={() => handleDispute(marketId)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Dispute
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
