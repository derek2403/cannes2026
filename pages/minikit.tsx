import { useState, useEffect, useCallback, useRef } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { createPublicClient, http, formatUnits } from "viem";
import { Geist } from "next/font/google";
import { PREDICTION_MARKET_ABI, ERC20_ABI } from "@/lib/prediction-market";
import { CONTRACTS } from "@/lib/contracts";
import WorldIdVerification from "@/components/WorldIdVerification";
import WalletAuth from "@/components/WalletAuth";
import PredictionMarket from "@/components/PredictionMarket";
import MyPositions from "@/components/MyPositions";
import DisputeResolution from "@/components/DisputeResolution";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;
const RP_ID = process.env.NEXT_PUBLIC_RP_ID!;
const PM_ADDRESS = CONTRACTS.predictionMarket;
const WLD_ADDRESS = CONTRACTS.wld;

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

export default function MiniKitPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState("");
  const [isMiniKit, setIsMiniKit] = useState(false);

  // Betting state
  const [selectedMarket, setSelectedMarket] = useState<string>("");
  const [pools, setPools] = useState<Record<string, PoolInfo>>({});
  const [wldBalance, setWldBalance] = useState<string | null>(null);
  const [positionKey, setPositionKey] = useState(0);

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

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    MiniKit.install(APP_ID);
    setIsMiniKit(MiniKit.isInstalled());

    fetch("/api/markets")
      .then((r) => r.json())
      .then((data: MarketData[]) => {
        setMarkets(data);
        if (data.length > 0 && !selectedMarket) {
          setSelectedMarket(data[0].id);
        }
        data.forEach((m) => refreshPool(m.id));
      })
      .catch(() => setMarkets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wallet) refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

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
        <WorldIdVerification
          verified={verified}
          setVerified={setVerified}
          setStatus={setStatus}
          appId={APP_ID}
          rpId={RP_ID}
        />

        {/* Step 2: Wallet Auth */}
        <WalletAuth
          wallet={wallet}
          setWallet={setWallet}
          verified={verified}
          wldBalance={wldBalance}
          setStatus={setStatus}
        />

        {/* Step 3: Prediction Market */}
        <PredictionMarket
          markets={markets}
          selectedMarket={selectedMarket}
          setSelectedMarket={setSelectedMarket}
          pools={pools}
          wallet={wallet}
          setStatus={setStatus}
          refreshPool={refreshPool}
          refreshBalance={refreshBalance}
          onBetPlaced={() => setPositionKey((k) => k + 1)}
        />

        {/* My Positions */}
        <MyPositions
          markets={markets}
          pools={pools}
          wallet={wallet ?? ""}
          setStatus={setStatus}
          refreshPool={refreshPool}
          refreshBalance={refreshBalance}
          refreshKey={positionKey}
        />

        {/* Dispute Resolution */}
        {selectedMarket && (
          <DisputeResolution marketId={selectedMarket} question={markets.find(m => m.id === selectedMarket)?.resolution.question} />
        )}

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

