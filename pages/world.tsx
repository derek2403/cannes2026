import { useState, useEffect, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { IDKit, orbLegacy } from "@worldcoin/idkit-core";
import type { IDKitCompletionResult } from "@worldcoin/idkit-core";
import { QRCodeSVG } from "qrcode.react";
import { encodeFunctionData, createPublicClient, http } from "viem";
import { Geist } from "next/font/google";
import { COUNTER_ABI, COUNTER_ADDRESS } from "@/lib/counter";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const APP_ID = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;
const RP_ID = process.env.NEXT_PUBLIC_RP_ID!;

// World Chain Sepolia
const WORLD_CHAIN_SEPOLIA_ID = 4801;
const client = createPublicClient({
  chain: {
    id: WORLD_CHAIN_SEPOLIA_ID,
    name: "World Chain Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: {
        http: ["https://worldchain-sepolia.g.alchemy.com/public"],
      },
    },
  },
  transport: http(),
});

export default function WorldPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [counter, setCounter] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isMiniKit, setIsMiniKit] = useState(false);

  const readCounter = useCallback(async () => {
    if (!COUNTER_ADDRESS) return;
    try {
      const value = await client.readContract({
        address: COUNTER_ADDRESS,
        abi: COUNTER_ABI,
        functionName: "x",
      });
      setCounter(value.toString());
    } catch {
      setCounter("?");
    }
  }, []);

  useEffect(() => {
    setIsMiniKit(MiniKit.isInstalled());
    readCounter();
  }, [readCounter]);

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

      // Show QR code for web users
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

      // Verify proof on backend
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

  // Step 3: Send transaction via MiniKit
  const handleIncrement = async () => {
    if (!COUNTER_ADDRESS) {
      setStatus("Counter contract not deployed yet");
      return;
    }
    if (!MiniKit.isInstalled()) {
      setStatus("Open this app in World App");
      return;
    }

    try {
      setStatus("Sending transaction...");

      const result = await MiniKit.sendTransaction({
        chainId: WORLD_CHAIN_SEPOLIA_ID,
        transactions: [
          {
            to: COUNTER_ADDRESS,
            data: encodeFunctionData({
              abi: COUNTER_ABI,
              functionName: "inc",
            }),
          },
        ],
      });

      if (result.executedWith === "fallback") {
        setStatus("Fallback not supported");
        return;
      }

      setStatus(`Tx submitted: ${result.data.userOpHash.slice(0, 10)}...`);

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

      const receipt = await pollUserOp(result.data.userOpHash);
      if (receipt) {
        setStatus("Counter incremented!");
        readCounter();
      } else {
        setStatus("Tx may still be pending");
        readCounter();
      }
    } catch (err) {
      setStatus(
        `Transaction error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

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
        </div>

        {/* Step 3: Counter */}
        <div className="w-full rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Step 3
          </p>
          <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Interact on-chain
          </p>

          <div className="mb-4 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Counter Value
            </p>
            <p className="mt-1 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              {counter ?? "..."}
            </p>
          </div>
          <button
            onClick={handleIncrement}
            disabled={!wallet}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Increment Counter
          </button>
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
