import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Geist } from "next/font/google";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

type VerifyStatus = "idle" | "loading" | "verified" | "error";

export default function Home() {
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [error, setError] = useState("");
  const [connectorURI, setConnectorURI] = useState("");

  const handleVerify = async () => {
    setStatus("loading");
    setError("");
    setConnectorURI("");

    try {
      // Dynamic import to avoid SSR issues (IDKit uses WASM)
      const { IDKit, CredentialRequest } = await import(
        "@worldcoin/idkit-core"
      );

      // Step 1: Get RP signature from backend
      const rpSig = await fetch("/api/rp-signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify-human" }),
      }).then((r) => r.json());

      if (rpSig.error) {
        throw new Error(rpSig.error);
      }

      // Step 2: Create IDKit v4 request with constraints
      const request = await IDKit.request({
        app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        action: "verify-human",
        rp_context: {
          rp_id: process.env.NEXT_PUBLIC_RP_ID!,
          nonce: rpSig.nonce,
          created_at: rpSig.created_at,
          expires_at: rpSig.expires_at,
          signature: rpSig.sig,
        },
        allow_legacy_proofs: false,
        environment: "production",
      }).constraints(CredentialRequest("proof_of_human"));

      // Step 3: Show QR code URL (user scans with World App)
      setConnectorURI(request.connectorURI);

      // Step 4: Wait for proof
      const completion = await request.pollUntilCompletion();

      if (!completion.success) {
        throw new Error(String(completion.error));
      }

      // Step 5: Verify proof on backend
      const verifyRes = await fetch("/api/verify-proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idkitResponse: completion.result }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error ?? "Verification failed");
      }

      setStatus("verified");
      setConnectorURI("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
      setConnectorURI("");
    }
  };

  return (
    <div
      className={`${geist.className} flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black`}
    >
      <main className="flex w-full max-w-md flex-col items-center gap-8 px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Cannes 2026
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Verify your humanity with World ID
          </p>
        </div>

        {status === "verified" ? (
          <div className="w-full rounded-2xl bg-green-50 px-6 py-4 text-center dark:bg-green-900/20">
            <p className="text-lg font-medium text-green-700 dark:text-green-400">
              Verified
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-500">
              You have been verified as a unique human.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleVerify}
              disabled={status === "loading"}
              className="w-full rounded-xl bg-zinc-900 px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {status === "loading"
                ? "Waiting for verification..."
                : "Verify with World ID"}
            </button>

            {connectorURI && (
              <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Scan with World App
                </p>
                <QRCodeSVG
                  value={connectorURI}
                  size={200}
                  bgColor="transparent"
                  fgColor="currentColor"
                  className="text-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}
          </>
        )}

        {error && (
          <div className="w-full rounded-2xl bg-red-50 px-6 py-3 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
