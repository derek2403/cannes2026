import { useState, useCallback } from "react";
import { IDKitRequestWidget, orbLegacy } from "@worldcoin/idkit";
import type { IDKitResult, RpContext } from "@worldcoin/idkit";

type Result = Record<string, unknown> | null;

/* ── Shared UI ─────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-700 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function ResultBox({ result, error }: { result: Result; error: string }) {
  if (error) {
    return (
      <pre className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm overflow-auto whitespace-pre-wrap">
        {error}
      </pre>
    );
  }
  if (result) {
    return (
      <pre className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded text-green-300 text-sm overflow-auto whitespace-pre-wrap">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  }
  return null;
}

async function callApi(
  url: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ── 1. World ID Verification ──────────────────────── */

function VerifyHuman() {
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}` | undefined;

  const handleOpen = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const ctx = await callApi("/api/world/rp-context", {
        action: "verify-oracle",
      });
      setRpContext(ctx as unknown as RpContext);
      setOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get RP context");
    }
    setLoading(false);
  }, []);

  const handleVerify = useCallback(async (proof: IDKitResult) => {
    const data = await callApi("/api/world/verify-human", proof as unknown as Record<string, unknown>);
    if ((data as Record<string, unknown>).error) {
      throw new Error((data as Record<string, unknown>).error as string);
    }
  }, []);

  const handleSuccess = useCallback((proof: IDKitResult) => {
    setResult(proof as unknown as Record<string, unknown>);
    setOpen(false);
  }, []);

  if (!appId) {
    return (
      <Section title="1. Verify Human Identity (World ID)">
        <p className="text-yellow-400 text-sm mb-2">
          Set NEXT_PUBLIC_WORLD_APP_ID in .env.local to enable World ID verification.
        </p>
        <p className="text-gray-400 text-sm">
          Get your app_id from{" "}
          <a
            href="https://developer.world.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            developer.world.org
          </a>
        </p>
      </Section>
    );
  }

  return (
    <Section title="1. Verify Human Identity (World ID)">
      <p className="text-gray-400 text-sm mb-4">
        Prove you are a unique human via World ID. This anonymous proof ties your
        identity to your oracle agent — no personal data shared.
      </p>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Verify with World ID"}
      </button>

      {rpContext && (
        <IDKitRequestWidget
          app_id={appId}
          action="verify-oracle"
          rp_context={rpContext}
          preset={orbLegacy()}
          allow_legacy_proofs={true}
          open={open}
          onOpenChange={setOpen}
          handleVerify={handleVerify}
          onSuccess={handleSuccess}
          onError={(code) => setError(`World ID error: ${code}`)}
        />
      )}

      <ResultBox result={result} error={error} />
    </Section>
  );
}

/* ── 2. Register Agent on AgentBook ────────────────── */

function RegisterAgent() {
  const [address, setAddress] = useState("");

  return (
    <Section title="2. Register Agent on AgentBook">
      <p className="text-gray-400 text-sm mb-4">
        Link your verified human identity to your AI agent&apos;s wallet. This is done
        once via the AgentKit CLI — it calls World App for verification and registers
        the binding on World Chain.
      </p>

      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">
          Agent Wallet Address
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
        />
      </div>

      <div className="bg-gray-800 border border-gray-600 rounded p-4">
        <p className="text-sm text-gray-300 mb-2">Run this CLI command to register:</p>
        <code className="block bg-gray-900 p-3 rounded text-green-400 text-sm">
          npx @worldcoin/agentkit-cli register {address || "<agent-wallet-address>"}
        </code>
        <p className="text-xs text-gray-500 mt-2">
          This opens World App for human verification, then submits the registration
          transaction to World Chain. One human = one agent.
        </p>
      </div>
    </Section>
  );
}

/* ── 3. Verify Agent (AgentBook Lookup) ────────────── */

function CheckAgent() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/world/check-agent", { address });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  };

  return (
    <Section title="3. Verify Agent (AgentBook Lookup)">
      <p className="text-gray-400 text-sm mb-4">
        Check if any wallet address is registered as a human-backed agent on
        AgentBook. Returns the anonymous human ID if registered.
      </p>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">
            Agent Wallet Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={loading || !address}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check AgentBook"}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

/* ── 4. Verify Agent (Live Demo) ───────────────────── */

type Step = { step: string; status: string; detail: string };

function VerifyAgent() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [humanId, setHumanId] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setSteps([]);
    setVerified(null);
    setHumanId(null);

    // Show step 1 immediately while waiting
    setSteps([
      { step: "AgentBook Lookup", status: "running", detail: `Calling lookupHuman(${address}) on World Chain...` },
    ]);

    try {
      const res = await fetch("/api/world/protected-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      setSteps(data.steps || []);
      setVerified(data.verified);
      setHumanId(data.humanId || null);
    } catch (e: unknown) {
      setSteps([
        { step: "Error", status: "failed", detail: e instanceof Error ? e.message : "Unknown error" },
      ]);
    }
    setLoading(false);
  };

  return (
    <Section title="4. Verify Agent is Human-Backed (Live Demo)">
      <p className="text-gray-400 text-sm mb-4">
        Calls <code className="text-blue-400">lookupHuman()</code> on the AgentBook
        contract (World Chain) to check if a wallet is tied to a verified human
        via World ID.
      </p>

      <div className="flex gap-3 items-end mb-4">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">
            Agent Wallet Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>
        <button
          onClick={handleVerify}
          disabled={loading || !address}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Verify"}
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-4">
        <p>
          <span className="text-green-400">Registered:</span>{" "}
          <code
            className="text-gray-300 cursor-pointer hover:text-white"
            onClick={() => setAddress("0x5B638972D1362701f298e9F02F67f8f485c3c52e")}
          >
            0x5B638972D1362701f298e9F02F67f8f485c3c52e
          </code>
        </p>
        <p>
          <span className="text-red-400">Unregistered:</span>{" "}
          <code
            className="text-gray-300 cursor-pointer hover:text-white"
            onClick={() => setAddress("0x0000000000000000000000000000000000000001")}
          >
            0x0000000000000000000000000000000000000001
          </code>
        </p>
      </div>

      {/* Step-by-step verification events */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`p-3 rounded border text-sm ${
                s.status === "passed"
                  ? "bg-green-900/20 border-green-700"
                  : s.status === "failed"
                  ? "bg-red-900/20 border-red-700"
                  : s.status === "running"
                  ? "bg-blue-900/20 border-blue-700"
                  : "bg-gray-800 border-gray-600"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>
                  {s.status === "passed"
                    ? "✓"
                    : s.status === "failed"
                    ? "✗"
                    : s.status === "running"
                    ? "..."
                    : "•"}
                </span>
                <span className="font-medium text-white">{s.step}</span>
              </div>
              <p className="text-xs text-gray-400 ml-6">{s.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Final result */}
      {verified !== null && (
        <div
          className={`mt-4 p-4 rounded border ${
            verified
              ? "bg-green-900/30 border-green-600"
              : "bg-red-900/30 border-red-600"
          }`}
        >
          <p className={`text-lg font-bold ${verified ? "text-green-400" : "text-red-400"}`}>
            {verified ? "VERIFIED — Human-Backed Agent" : "NOT VERIFIED — No Human Linked"}
          </p>
          {humanId && (
            <p className="text-xs text-gray-400 mt-1">
              Anonymous Human ID: <code className="text-green-300">{humanId}</code>
            </p>
          )}
          {!verified && (
            <p className="text-xs text-gray-400 mt-1">
              This wallet has no World ID proof registered on AgentBook.
              Register via: <code className="text-blue-400">npx agentkit register {address}</code>
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

/* ── Page ──────────────────────────────────────────── */

export default function WorldPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">
        World — Agent Kit + World ID
      </h1>
      <p className="text-gray-400 mb-8">
        Human-verified AI agents for sybil-resistant oracle consensus.
        Each oracle agent must be backed by a unique verified human.
      </p>

      <VerifyHuman />
      <RegisterAgent />
      <CheckAgent />
      <VerifyAgent />
    </main>
  );
}
