import { useState } from "react";
import Head from "next/head";

const BASE = typeof window !== "undefined" ? window.location.origin : "";

const CURL_EXAMPLES = [
  {
    title: "1. Request without payment (get 402 + PAYMENT-REQUIRED header)",
    cmd: `curl -s -D - ${BASE || "http://localhost:3000"}/api/x402/news`,
    note: "Returns HTTP 402 with base64-encoded PAYMENT-REQUIRED header containing price, network, and payTo address.",
  },
  {
    title: "2. Agent auto-pays with @x402/fetch",
    cmd: `import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const client = new x402Client()
  .register("eip155:*", new ExactEvmScheme(account));

const fetchWithPay = wrapFetchWithPayment(fetch, client);

// Auto: receives 402 → signs USDC payment → retries → gets data
const res = await fetchWithPay("${BASE || "http://localhost:3000"}/api/x402/news");
const data = await res.json();`,
    note: "The x402 client handles the full flow automatically: parse 402 → sign EIP-3009 USDC authorization → retry with PAYMENT-SIGNATURE header → facilitator settles on-chain.",
  },
  {
    title: "3. Subscribe for recurring access (Hedera scheduled tx)",
    cmd: `curl -s -X POST ${BASE || "http://localhost:3000"}/api/x402/subscribe \\
  -H "Content-Type: application/json" \\
  -d '{"payer_account_id":"0.0.YOUR_ACCOUNT","duration_minutes":10}'`,
    note: "Alternative: creates a Hedera ScheduleCreateTransaction for HBAR-based recurring payments. Returns a subscription_id.",
  },
  {
    title: "4. Agent polling loop (every 10 seconds)",
    cmd: `import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0xAGENT_KEY");
const client = new x402Client()
  .register("eip155:*", new ExactEvmScheme(account));
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// Poll every 10 seconds — each request pays 0.01 USDC
setInterval(async () => {
  const res = await fetchWithPay("${BASE || "http://localhost:3000"}/api/x402/news");
  const { markets, oracle_activity } = await res.json();
  console.log(markets.length, "markets,", oracle_activity.length, "events");
}, 10_000);`,
    note: "Each GET costs $0.01 USDC on Base Sepolia. The facilitator at x402.org settles each payment on-chain automatically.",
  },
];

const FLOW_DIAGRAM = `
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Agent       │────────▶│  Resource Server  │────────▶│  Facilitator │
│  (x402 client)│        │  (middleware.ts)  │         │  x402.org    │
└──────┬──────┘         └────────┬─────────┘         └──────┬───────┘
       │                         │                           │
       │  GET /api/x402/news     │                           │
       │────────────────────────▶│                           │
       │                         │                           │
       │  402 + PAYMENT-REQUIRED │                           │
       │◀────────────────────────│                           │
       │                         │                           │
       │  Sign USDC payment      │                           │
       │  (EIP-3009 authz)       │                           │
       │                         │                           │
       │  GET + PAYMENT-SIGNATURE│                           │
       │────────────────────────▶│                           │
       │                         │  POST /verify             │
       │                         │──────────────────────────▶│
       │                         │  ✓ valid                  │
       │                         │◀──────────────────────────│
       │                         │                           │
       │  200 + market data      │                           │
       │◀────────────────────────│                           │
       │                         │  POST /settle             │
       │                         │──────────────────────────▶│
       │                         │  USDC transferred on-chain│
       │                         │◀──────────────────────────│
`.trim();

export default function X402Page() {
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const [liveHeaders, setLiveHeaders] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [subAccount, setSubAccount] = useState("");
  const [subMinutes, setSubMinutes] = useState("10");
  const [subResult, setSubResult] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  const tryRequest = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/x402/news");
      const headers: string[] = [];
      resp.headers.forEach((v, k) => headers.push(`${k}: ${v}`));
      setLiveHeaders(`HTTP ${resp.status}\n${headers.join("\n")}`);
      const data = await resp.json();
      setLiveResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setLiveResult(String(e));
    }
    setLoading(false);
  };

  const trySubscribe = async () => {
    if (!subAccount) return;
    setSubLoading(true);
    try {
      const resp = await fetch("/api/x402/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer_account_id: subAccount,
          duration_minutes: parseInt(subMinutes) || 10,
        }),
      });
      const data = await resp.json();
      setSubResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setSubResult(String(e));
    }
    setSubLoading(false);
  };

  return (
    <>
      <Head>
        <title>x402 Payment API | Dive</title>
      </Head>

      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#e5e5e5",
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "1px solid #262626", padding: "24px 32px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
            <span style={{ color: "#f59e0b" }}>x402</span> Payment API
          </h1>
          <p style={{ color: "#a3a3a3", marginTop: 8, fontSize: 14 }}>
            Coinbase x402 protocol &mdash; agents pay USDC (Base Sepolia) to
            access prediction market data feeds
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Protocol", value: "x402 v2" },
              { label: "Network", value: "Base Sepolia (84532)" },
              { label: "Asset", value: "USDC" },
              { label: "Price", value: "$0.01 / request" },
              { label: "Facilitator", value: "x402.org" },
            ].map((t) => (
              <span
                key={t.label}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#737373" }}>{t.label}:</span>{" "}
                <span style={{ color: "#f59e0b" }}>{t.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
          {/* Flow diagram */}
          <div
            style={{
              background: "#141414",
              border: "1px solid #262626",
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#f59e0b",
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              x402 Protocol Flow
            </h2>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              {[
                { step: "1", label: "Request", desc: "GET /api/x402/news", color: "#3b82f6" },
                { step: "2", label: "402 Response", desc: "PAYMENT-REQUIRED header", color: "#ef4444" },
                { step: "3", label: "Sign Payment", desc: "EIP-3009 USDC authz", color: "#f59e0b" },
                { step: "4", label: "Retry + Pay", desc: "PAYMENT-SIGNATURE header", color: "#8b5cf6" },
                { step: "5", label: "Verify + Settle", desc: "Facilitator on-chain", color: "#22c55e" },
                { step: "6", label: "Data Returned", desc: "Markets + Oracle feed", color: "#06b6d4" },
              ].map((s) => (
                <div
                  key={s.step}
                  style={{
                    background: `${s.color}15`,
                    border: `1px solid ${s.color}40`,
                    borderRadius: 8,
                    padding: "12px 14px",
                    minWidth: 120,
                    textAlign: "center",
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 700, marginBottom: 4 }}>
                    Step {s.step}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "#a3a3a3" }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <pre
              style={{
                background: "#0a0a0a",
                border: "1px solid #333",
                borderRadius: 8,
                padding: 16,
                fontSize: 11,
                lineHeight: 1.5,
                overflow: "auto",
                color: "#737373",
                margin: 0,
              }}
            >
              {FLOW_DIAGRAM}
            </pre>
          </div>

          {/* Code examples */}
          <div
            style={{
              background: "#141414",
              border: "1px solid #262626",
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#e5e5e5",
                marginTop: 0,
                marginBottom: 20,
              }}
            >
              Usage Examples
            </h2>
            {CURL_EXAMPLES.map((ex, i) => (
              <div key={i} style={{ marginBottom: i < CURL_EXAMPLES.length - 1 ? 24 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>
                  {ex.title}
                </div>
                <pre
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 12,
                    lineHeight: 1.6,
                    overflow: "auto",
                    color: "#22c55e",
                    margin: 0,
                  }}
                >
                  {ex.cmd}
                </pre>
                <p style={{ fontSize: 12, color: "#737373", marginTop: 6, marginBottom: 0 }}>
                  {ex.note}
                </p>
              </div>
            ))}
          </div>

          {/* Live test */}
          <div
            style={{
              background: "#141414",
              border: "1px solid #262626",
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#e5e5e5",
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              Live Test
            </h2>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>
                Try requesting without payment (expect 402)
              </div>
              <button
                onClick={tryRequest}
                disabled={loading}
                style={{
                  background: loading ? "#333" : "#f59e0b",
                  color: "#000",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Requesting..." : "GET /api/x402/news"}
              </button>
              {liveHeaders && (
                <pre
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #555",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 11,
                    lineHeight: 1.4,
                    overflow: "auto",
                    marginTop: 12,
                    color: "#a3a3a3",
                  }}
                >
                  {liveHeaders}
                </pre>
              )}
              {liveResult && (
                <pre
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 11,
                    lineHeight: 1.5,
                    overflow: "auto",
                    marginTop: 8,
                    maxHeight: 400,
                    color: liveResult.includes('"error"') ? "#ef4444" : "#22c55e",
                  }}
                >
                  {liveResult}
                </pre>
              )}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", marginBottom: 8 }}>
                Hedera subscription (alternative to x402 per-request)
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={subAccount}
                  onChange={(e) => setSubAccount(e.target.value)}
                  placeholder="Payer account (0.0.xxxxx)"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: "#e5e5e5",
                    fontSize: 13,
                    flex: 1,
                    minWidth: 200,
                  }}
                />
                <input
                  value={subMinutes}
                  onChange={(e) => setSubMinutes(e.target.value)}
                  placeholder="Minutes"
                  type="number"
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: "#e5e5e5",
                    fontSize: 13,
                    width: 100,
                  }}
                />
                <button
                  onClick={trySubscribe}
                  disabled={subLoading || !subAccount}
                  style={{
                    background: subLoading || !subAccount ? "#333" : "#8b5cf6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: subLoading || !subAccount ? "not-allowed" : "pointer",
                  }}
                >
                  {subLoading ? "Creating..." : "Subscribe"}
                </button>
              </div>
              {subResult && (
                <pre
                  style={{
                    background: "#0a0a0a",
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: 16,
                    fontSize: 11,
                    lineHeight: 1.5,
                    overflow: "auto",
                    marginTop: 12,
                    maxHeight: 400,
                    color: subResult.includes('"error"') ? "#ef4444" : "#22c55e",
                  }}
                >
                  {subResult}
                </pre>
              )}
            </div>
          </div>

          {/* API Reference */}
          <div
            style={{
              background: "#141414",
              border: "1px solid #262626",
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#e5e5e5",
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              API Reference
            </h2>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  {["Endpoint", "Method", "Description"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        color: "#a3a3a3",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    ep: "/api/x402/news",
                    method: "GET",
                    desc: "x402-protected market data feed. Middleware handles 402 + settlement.",
                    color: "#22c55e",
                  },
                  {
                    ep: "/api/x402/subscribe",
                    method: "POST",
                    desc: "Hedera scheduled tx subscription (alternative payment method).",
                    color: "#3b82f6",
                  },
                  {
                    ep: "/api/x402/transfer",
                    method: "POST",
                    desc: "Direct 0G token transfer.",
                    color: "#3b82f6",
                  },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "8px 12px" }}>
                      <code style={{ color: "#f59e0b" }}>{r.ep}</code>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        style={{
                          background: `${r.color}20`,
                          color: r.color,
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {r.method}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#a3a3a3" }}>{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* x402 Headers */}
          <div
            style={{
              background: "#141414",
              border: "1px solid #262626",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#e5e5e5",
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              x402 Protocol Headers
            </h2>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  {["Header", "Direction", "Description"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        color: "#a3a3a3",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    h: "PAYMENT-REQUIRED",
                    dir: "Server → Client",
                    d: "Base64 JSON with payment requirements (price, network, payTo, scheme)",
                  },
                  {
                    h: "PAYMENT-SIGNATURE",
                    dir: "Client → Server",
                    d: "Base64 JSON with signed EIP-3009 USDC authorization",
                  },
                  {
                    h: "PAYMENT-RESPONSE",
                    dir: "Server → Client",
                    d: "Base64 JSON with settlement receipt (tx hash, amount)",
                  },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "8px 12px" }}>
                      <code style={{ color: "#22c55e" }}>{r.h}</code>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ color: "#8b5cf6" }}>{r.dir}</span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#a3a3a3" }}>{r.d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
