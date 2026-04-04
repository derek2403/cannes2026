import { useState } from "react";
import { IDKit, orbLegacy } from "@worldcoin/idkit-core";
import type { IDKitCompletionResult } from "@worldcoin/idkit-core";
import { QRCodeSVG } from "qrcode.react";

interface WorldIdVerificationProps {
  verified: boolean;
  setVerified: (v: boolean) => void;
  setStatus: (s: string) => void;
  appId: `app_${string}`;
  rpId: string;
}

export default function WorldIdVerification({
  verified,
  setVerified,
  setStatus,
  appId,
  rpId,
}: WorldIdVerificationProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

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
        app_id: appId,
        action: "verify-human",
        rp_context: {
          rp_id: rpId,
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

  return (
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
  );
}
