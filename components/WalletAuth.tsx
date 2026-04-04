import { MiniKit } from "@worldcoin/minikit-js";

interface WalletAuthProps {
  wallet: string | null;
  setWallet: (w: string | null) => void;
  verified: boolean;
  wldBalance: string | null;
  setStatus: (s: string) => void;
}

export default function WalletAuth({
  wallet,
  setWallet,
  verified,
  wldBalance,
  setStatus,
}: WalletAuthProps) {
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

  return (
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
  );
}
