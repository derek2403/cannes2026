import { useState, useEffect, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { IDKit, orbLegacy } from "@worldcoin/idkit-core";
import type { IDKitCompletionResult } from "@worldcoin/idkit-core";
import { QRCodeSVG } from "qrcode.react";
import {
  encodeFunctionData,
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
} from "viem";
import { Geist } from "next/font/google";
import {
  PREDICTION_MARKET_ABI,
  ERC20_ABI,
  WLD_ADDRESS,
  Outcome,
} from "@/lib/prediction-market";
import fs from "fs";
import path from "path";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;
const RP_ID = process.env.NEXT_PUBLIC_RP_ID!;
const PM_ADDRESS = "0xeb57f9a1BA627aa7Aa68B6c927D1a28aab1eac8b" as `0x${string}`;

// World Chain Mainnet
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

export default function MiniKitPage({ markets }: { markets: MarketData[] }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isMiniKit, setIsMiniKit] = useState(false);

  // Betting state
  const [selectedMarket, setSelectedMarket] = useState<string>(
    markets[0]?.id ?? ""
  );
  const [betAmount, setBetAmount] = useState("1");
  const [pools, setPools] = useState<Record<string, PoolInfo>>({});
  const [wldBalance, setWldBalance] = useState<string | null>(null);

  const refreshPool = useCallback(
    async (marketId: string) => {
      try {
        const result = (await client.readContract({
          address: PM_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          functionName: "getPool",
          args: [marketId],
        })) as [bigint, bigint, boolean, number];
        setPools((prev) => ({
          ...prev,
          [marketId]: {
            yesPool: result[0],
            noPool: result[1],
            resolved: result[2],
            outcome: result[3],
          },
        }));
      } catch {
        // market may not have bets yet
      }
    },
    []
  );

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const bal = (await client.readContract({
        address: WLD_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet as `0x${string}`],
      })) as bigint;
      setWldBalance(formatUnits(bal, 18));
    } catch {
      setWldBalance(null);
    }
  }, [wallet]);

  useEffect(() => {
    MiniKit.install();
    setIsMiniKit(MiniKit.isInstalled());
    markets.forEach((m) => refreshPool(m.id));
  }, [markets, refreshPool]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

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

  // Step 1: World ID verification via IDKit
  const handleVerify = async () => {
    try {
      setStatus("Getting RP signature...");
      const rpSig = await fetch("/api/rp-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-human" }),
      }).then((r) => r.json());

      if (rpSig.error) {
        setStatus(`RP signature error: ${rpSig.error}`);
        return;
      }

      setStatus("Creating verification request...");
      const request = await IDKit.request({
        app_id: APP_ID,
        action: "verify-human",
        rp_context: {
          rp_id: RP_ID,
          nonce: rpSig.nonce,
          created_at: rpSig.created_at,
          expires_at: rpSig.expires_at,
          signature: rpSig.sig,
        },
        allow_legacy_proofs: true,
        environment: "production",
      }).preset(orbLegacy());

      if (request.connectorURI) {
        setQrUrl(request.connectorURI);
        setStatus("Scan the QR code with World App");
      } else {
        setStatus("Waiting for World App confirmation...");
      }

      const completion: IDKitCompletionResult =
        await request.pollUntilCompletion();

      setQrUrl(null);

      if (!completion.success) {
        const failed = completion as { success: false; error: string };
        setStatus(`Verification failed: ${failed.error}`);
        return;
      }

      setStatus("Verifying proof on server...");
      const verifyRes = await fetch("/api/verify-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idkitResponse: completion.result }),
      });

      const text = await verifyRes.text();
      let verifyData;
      try {
        verifyData = JSON.parse(text);
      } catch {
        setStatus(`Server error: ${text.slice(0, 200)}`);
        return;
      }

      if (verifyData.success) {
        setVerified(true);
        setStatus("");
      } else {
        setStatus(verifyData.error ?? "Proof verification failed");
      }
    } catch (err) {
      setQrUrl(null);
      setStatus(
        `Verify error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // Step 2: Wallet auth (SIWE) via MiniKit
  const handleSignIn = async () => {
    if (!MiniKit.isInstalled()) {
      setStatus("Open this app in World App");
      return;
    }

    try {
      setStatus("Fetching nonce...");
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      setStatus("Requesting wallet signature...");
      const result = await MiniKit.walletAuth({
        nonce,
        statement: "Sign in to Cannes 2026",
        expirationTime: new Date(Date.now() + 1000 * 60 * 60),
      });

      if (result.executedWith === "fallback") {
        setStatus("Fallback auth not supported");
        return;
      }

      setStatus("Verifying SIWE...");
      const verifyRes = await fetch("/api/auth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: result.data, nonce }),
      });

      const text = await verifyRes.text();
      let verifyData;
      try {
        verifyData = JSON.parse(text);
      } catch {
        setStatus(`Server error: ${text.slice(0, 200)}`);
        return;
      }

      if (verifyData.isValid) {
        setWallet(verifyData.address);
        setStatus("");
      } else {
        setStatus(verifyData.error ?? "Sign in failed");
      }
    } catch (err) {
      setStatus(
        `Sign in error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // Step 3: Bet on a market (approve WLD + bet in one MiniKit tx)
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
      } else {
        setStatus("Tx may still be pending");
      }
    } catch (err) {
      setStatus(
        `Bet error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  // Claim winnings
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
    <div
      className={`${geist.className} flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black`}
    >
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Cannes 2026
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            World ID + MiniKit Demo
          </p>
        </div>

        {/* MiniKit status */}
        <div
          className={`w-full rounded-xl px-4 py-3 text-center text-sm ${
            isMiniKit
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
          }`}
        >
          {isMiniKit
            ? "Running in World App"
            : "Not in World App (MiniKit unavailable)"}
        </div>

        {/* Step 1: World ID Verification */}
        <div className="w-full rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Step 1
          </p>
          <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Verify you are human
          </p>

          {verified ? (
            <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20">
              <span className="text-sm text-green-700 dark:text-green-400">
                World ID Verified
              </span>
              <span className="text-xs text-green-600 dark:text-green-500">
                &#10003;
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={handleVerify}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Verify with World ID
              </button>
              {qrUrl && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <QRCodeSVG value={qrUrl} size={200} />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Scan with World App
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Step 2: Wallet Auth */}
        <div className="w-full rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Step 2
          </p>
          <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sign in with wallet
          </p>

          {wallet ? (
            <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 dark:bg-green-900/20">
              <span className="text-sm text-green-700 dark:text-green-400">
                {wallet.slice(0, 6)}...{wallet.slice(-4)}
              </span>
              <span className="text-xs text-green-600 dark:text-green-500">
                Connected
              </span>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={!verified}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign In with World App
            </button>
          )}

          {wallet && wldBalance !== null && (
            <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
              WLD Balance: {parseFloat(wldBalance).toFixed(2)} WLD
            </p>
          )}
        </div>

        {/* Step 3: Prediction Market */}
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

        {/* Status */}
        {status && (
          <div className="w-full rounded-xl bg-yellow-50 px-4 py-2 text-center text-sm text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
            {status}
          </div>
        )}
      </main>
    </div>
  );
}

// Load markets from data/markets.json at request time
export async function getServerSideProps() {
  const marketsPath = path.join(process.cwd(), "data", "markets.json");
  let raw: { id: string; resolution: { question: string } }[] = [];

  if (fs.existsSync(marketsPath)) {
    try {
      raw = JSON.parse(fs.readFileSync(marketsPath, "utf-8"));
    } catch {
      raw = [];
    }
  }

  const markets = raw.map((m) => ({
    id: m.id,
    resolution: { question: m.resolution.question },
  }));

  return { props: { markets } };
}
