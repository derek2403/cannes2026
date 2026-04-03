import { useState } from "react";

interface ApiResult {
  success: boolean;
  [key: string]: unknown;
}

interface ServiceItem {
  provider: string;
  model: string;
  serviceType: string;
  url: string;
  inputPrice: string;
  outputPrice: string;
  verifiability: string;
}

interface FTServiceItem {
  provider: string;
  url: string;
  pricePerToken: string;
  models: string[];
  occupied: boolean;
  teeSignerAcknowledged: boolean;
}

interface FTTaskItem {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  progress?: string;
  datasetHash?: string;
  preTrainedModelHash?: string;
  fee?: string;
}

export default function ComputePage() {
  // Services state
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesResult, setServicesResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Account state
  const [ledgerAmount, setLedgerAmount] = useState("0.5");
  const [depositAmount, setDepositAmount] = useState("0.5");
  const [transferAmount, setTransferAmount] = useState("0.1");
  const [transferProvider, setTransferProvider] = useState("");
  const [accountResult, setAccountResult] = useState<ApiResult | null>(null);
  const [balanceResult, setBalanceResult] = useState<ApiResult | null>(null);

  // Inference state
  const [inferProvider, setInferProvider] = useState("");
  const [inferMessage, setInferMessage] = useState(
    "Classify this text as positive, negative, or neutral: 'The new Hedera SDK update fixed the token transfer bug and performance is much better now.'"
  );
  const [inferResult, setInferResult] = useState<ApiResult | null>(null);

  // Fine-tuning state
  const [ftServices, setFtServices] = useState<FTServiceItem[]>([]);
  const [ftServicesResult, setFtServicesResult] = useState<ApiResult | null>(null);
  const [ftModels, setFtModels] = useState<ApiResult | null>(null);
  const [ftProvider, setFtProvider] = useState("0xA02b95Aa6886b1116C4f334eDe00381511E31A09");
  const [ftModel, setFtModel] = useState("Qwen2.5-0.5B-Instruct");
  const [ftDataset, setFtDataset] = useState(
    JSON.stringify(
      [
        {
          instruction: "Classify this developer question",
          input: "How do I fix a token transfer bug in Hedera SDK?",
          output: "Category: SDK Bug Report | Domain: Hedera | Priority: High",
        },
        {
          instruction: "Classify this developer question",
          input: "What is the best way to deploy a smart contract on 0G?",
          output: "Category: Deployment Guide | Domain: 0G | Priority: Medium",
        },
        {
          instruction: "Classify this developer question",
          input: "My webhook is not receiving events from Stripe",
          output: "Category: Integration Issue | Domain: Payments | Priority: High",
        },
      ],
      null,
      2
    )
  );
  const [ftCreateResult, setFtCreateResult] = useState<ApiResult | null>(null);
  const [ftTaskId, setFtTaskId] = useState("");
  const [ftTaskResult, setFtTaskResult] = useState<ApiResult | null>(null);
  const [ftLogResult, setFtLogResult] = useState<ApiResult | null>(null);

  // --- Handlers ---

  async function handleListServices() {
    setLoading("services");
    setServicesResult(null);
    try {
      const res = await fetch("/api/compute/list-services", { method: "POST" });
      const result = await res.json();
      setServicesResult(result);
      if (result.success && result.services) {
        setServices(result.services);
        if (result.services.length > 0) {
          const first = result.services[0].provider;
          setTransferProvider(first);
          setInferProvider(first);
        }
      }
    } catch (err) {
      setServicesResult({ success: false, error: String(err) });
    }
    setLoading(null);
  }

  async function handleAccountAction(action: string) {
    const loadKey = `account-${action}`;
    setLoading(loadKey);
    setAccountResult(null);
    try {
      const body: Record<string, string> = { action };
      if (action === "create-ledger") body.amount = ledgerAmount;
      if (action === "deposit") body.amount = depositAmount;
      if (action === "transfer") {
        body.amount = transferAmount;
        body.provider = transferProvider;
      }
      if (action === "transfer-ft") {
        body.action = "transfer";
        body.amount = transferAmount;
        body.provider = ftProvider || transferProvider;
        body.service = "fine-tuning";
      }
      const res = await fetch("/api/compute/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      setAccountResult(result);
    } catch (err) {
      setAccountResult({ success: false, error: String(err) });
    }
    setLoading(null);
  }

  async function handleGetBalance() {
    setLoading("balance");
    setBalanceResult(null);
    try {
      const res = await fetch("/api/compute/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-balance" }),
      });
      const result = await res.json();
      setBalanceResult(result);
    } catch (err) {
      setBalanceResult({ success: false, error: String(err) });
    }
    setLoading(null);
  }

  // --- Fine-tuning Handlers ---

  async function handleFTListServices() {
    setLoading("ft-services");
    setFtServicesResult(null);
    try {
      const res = await fetch("/api/compute/ft-list-services", { method: "POST" });
      const result = await res.json();
      setFtServicesResult(result);
      if (result.success && result.services) {
        setFtServices(result.services);
        if (result.services.length > 0 && !ftProvider) {
          setFtProvider(result.services[0].provider);
        }
      }
    } catch (err) {
      setFtServicesResult({ success: false, error: String(err) });
    }
    setLoading(null);
  }

  async function handleFTListModels() {
    setLoading("ft-models");
    setFtModels(null);
    try {
      const res = await fetch("/api/compute/ft-list-models", { method: "POST" });
      const result = await res.json();
      setFtModels(result);
    } catch (err) {
      setFtModels({ success: false, error: String(err) });
    }
    setLoading(null);
  }

  async function handleFTCreateTask() {
    if (!ftProvider) {
      setFtCreateResult({ success: false, error: "Select a provider first" });
      return;
    }
    let parsedDataset;
    try {
      parsedDataset = JSON.parse(ftDataset);
    } catch {
      setFtCreateResult({ success: false, error: "Invalid JSON dataset" });
      return;
    }
    setLoading("ft-create");
    setFtCreateResult(null);
    try {
      const res = await fetch("/api/compute/ft-create-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: ftProvider,
          model: ftModel,
          dataset: parsedDataset,
        }),
      });
      const result = await res.json();
      setFtCreateResult(result);
      if (result.success && result.taskId) {
        setFtTaskId(result.taskId);
      }
    } catch (err) {
      setFtCreateResult({ success: false, error: String(err) });
    }
    setLoading(null);
  }

  async function handleFTGetTask(action: "status" | "list" | "log") {
    if (!ftProvider) {
      setFtTaskResult({ success: false, error: "Select a provider first" });
      return;
    }
    const loadKey = `ft-${action}`;
    setLoading(loadKey);
    if (action === "log") {
      setFtLogResult(null);
    } else {
      setFtTaskResult(null);
    }
    try {
      const res = await fetch("/api/compute/ft-get-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: ftProvider,
          taskId: ftTaskId || undefined,
          action: action === "status" ? undefined : action,
        }),
      });
      const result = await res.json();
      if (action === "log") {
        setFtLogResult(result);
      } else {
        setFtTaskResult(result);
      }
    } catch (err) {
      const errResult = { success: false, error: String(err) };
      if (action === "log") {
        setFtLogResult(errResult);
      } else {
        setFtTaskResult(errResult);
      }
    }
    setLoading(null);
  }

  async function handleInference() {
    if (!inferProvider) {
      setInferResult({ success: false, error: "Select a provider first" });
      return;
    }
    if (!inferMessage) {
      setInferResult({ success: false, error: "Enter a message" });
      return;
    }
    setLoading("inference");
    setInferResult(null);
    try {
      const res = await fetch("/api/compute/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: inferProvider,
          message: inferMessage,
        }),
      });
      const result = await res.json();
      setInferResult(result);
    } catch (err) {
      setInferResult({ success: false, error: String(err) });
    }
    setLoading(null);
  }

  return (
    <div
      style={{
        maxWidth: 780,
        margin: "40px auto",
        fontFamily: "monospace",
        padding: "0 20px",
      }}
    >
      <h1>0G Compute Network</h1>
      <p style={{ color: "#888" }}>
        Decentralized GPU marketplace — inference via OpenAI-compatible API,
        pay-per-request on-chain
      </p>
      <p style={{ color: "#666", fontSize: 12 }}>
        Network: 0G Testnet (evmrpc-testnet.0g.ai) | SDK:
        @0glabs/0g-serving-broker
      </p>

      <hr style={{ margin: "24px 0" }} />

      {/* 1. Discover Services */}
      <section style={{ margin: "24px 0" }}>
        <h2>1. Discover AI Services</h2>
        <p style={{ color: "#888", fontSize: 13 }}>
          List available AI providers on the 0G Compute Network. Each provider
          runs a model and sets input/output pricing.
        </p>
        <button
          onClick={handleListServices}
          disabled={loading === "services"}
        >
          {loading === "services" ? "Fetching..." : "List Available Services"}
        </button>
        {servicesResult && !servicesResult.services && (
          <ResultBlock data={servicesResult} />
        )}
        {services.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f1f5f9",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                    Model
                  </th>
                  <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                    Provider
                  </th>
                  <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                    Verify
                  </th>
                  <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        padding: 6,
                        border: "1px solid #e2e8f0",
                        fontWeight: "bold",
                      }}
                    >
                      {s.model}
                    </td>
                    <td
                      style={{
                        padding: 6,
                        border: "1px solid #e2e8f0",
                        fontSize: 10,
                        wordBreak: "break-all",
                      }}
                    >
                      {s.provider}
                    </td>
                    <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                      {s.verifiability}
                    </td>
                    <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                      <button
                        onClick={() => {
                          setInferProvider(s.provider);
                          setTransferProvider(s.provider);
                        }}
                        style={{ fontSize: 11 }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
              {services.length} service(s) found
            </p>
          </div>
        )}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* 2. Account Setup */}
      <section style={{ margin: "24px 0" }}>
        <h2>2. Account Setup</h2>
        <p style={{ color: "#888", fontSize: 13 }}>
          Fund your 0G Compute ledger, then transfer to a provider sub-account
          before making inference calls.
        </p>

        {/* Create Ledger */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <strong>Step A — Create Ledger (first time)</strong>
          <div style={{ marginTop: 8 }}>
            <label>
              Initial deposit (A0GI):{" "}
              <input
                value={ledgerAmount}
                onChange={(e) => setLedgerAmount(e.target.value)}
                style={{ width: 80, fontFamily: "monospace" }}
              />
            </label>
            <button
              onClick={() => handleAccountAction("create-ledger")}
              disabled={loading === "account-create-ledger"}
              style={{ marginLeft: 8 }}
            >
              {loading === "account-create-ledger"
                ? "Creating..."
                : "Create Ledger"}
            </button>
          </div>
        </div>

        {/* Deposit */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <strong>Step B — Deposit More Funds</strong>
          <div style={{ marginTop: 8 }}>
            <label>
              Amount (A0GI):{" "}
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{ width: 80, fontFamily: "monospace" }}
              />
            </label>
            <button
              onClick={() => handleAccountAction("deposit")}
              disabled={loading === "account-deposit"}
              style={{ marginLeft: 8 }}
            >
              {loading === "account-deposit" ? "Depositing..." : "Deposit"}
            </button>
          </div>
        </div>

        {/* Transfer to provider */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <strong>Step C — Transfer to Provider</strong>
          <div style={{ marginTop: 8 }}>
            <label>
              Provider:{" "}
              <input
                value={transferProvider}
                onChange={(e) => setTransferProvider(e.target.value)}
                placeholder="0x..."
                style={{ width: 380, fontFamily: "monospace", fontSize: 11 }}
              />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Amount (A0GI):{" "}
              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                style={{ width: 80, fontFamily: "monospace" }}
              />
            </label>
            <button
              onClick={() => handleAccountAction("transfer")}
              disabled={loading === "account-transfer"}
              style={{ marginLeft: 8 }}
            >
              {loading === "account-transfer"
                ? "Transferring..."
                : "Transfer (Inference)"}
            </button>
            <button
              onClick={() => handleAccountAction("transfer-ft")}
              disabled={loading === "account-transfer-ft"}
              style={{ marginLeft: 8 }}
            >
              {loading === "account-transfer-ft"
                ? "Transferring..."
                : "Transfer (Fine-Tuning)"}
            </button>
          </div>
        </div>

        {accountResult && <ResultBlock data={accountResult} />}

        {/* Balance check */}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={handleGetBalance}
            disabled={loading === "balance"}
          >
            {loading === "balance" ? "Checking..." : "Check Balance"}
          </button>
          {balanceResult && <ResultBlock data={balanceResult} />}
        </div>
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* 3. Inference */}
      <section style={{ margin: "24px 0" }}>
        <h2>3. AI Inference</h2>
        <p style={{ color: "#888", fontSize: 13 }}>
          Send a prompt to a 0G Compute provider. The request is authenticated
          on-chain, the response is verifiable via TEE signatures.
        </p>

        <div>
          <label>
            Provider:{" "}
            <input
              value={inferProvider}
              onChange={(e) => setInferProvider(e.target.value)}
              placeholder="0x... (select from table above)"
              style={{ width: 380, fontFamily: "monospace", fontSize: 11 }}
            />
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>
            Prompt:
            <br />
            <textarea
              value={inferMessage}
              onChange={(e) => setInferMessage(e.target.value)}
              style={{
                width: "100%",
                height: 80,
                fontFamily: "monospace",
                fontSize: 12,
                marginTop: 4,
              }}
            />
          </label>
        </div>
        <button
          onClick={handleInference}
          disabled={loading === "inference"}
          style={{ marginTop: 8 }}
        >
          {loading === "inference"
            ? "Running inference..."
            : "Send to 0G Compute"}
        </button>

        {inferResult && (
          <>
            {inferResult.success && inferResult.response && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  padding: 12,
                  marginTop: 8,
                  borderRadius: 4,
                }}
              >
                <strong>AI Response:</strong>
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                  {inferResult.response as string}
                </p>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "#666",
                    borderTop: "1px solid #86efac",
                    paddingTop: 8,
                  }}
                >
                  <div>Model: {inferResult.model as string}</div>
                  <div>
                    Provider: {(inferResult.provider as string)?.slice(0, 10)}...
                  </div>
                  <div>
                    Verified:{" "}
                    {inferResult.verified === true
                      ? "Yes"
                      : inferResult.verified === false
                        ? "No"
                        : "Skipped"}
                  </div>
                  {inferResult.usage != null && (
                    <div>
                      Tokens:{" "}
                      {JSON.stringify(inferResult.usage as Record<string, unknown>)}
                    </div>
                  )}
                </div>
              </div>
            )}
            {!inferResult.success && <ResultBlock data={inferResult} />}
          </>
        )}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* 4. Fine-Tuning */}
      <section style={{ margin: "24px 0" }}>
        <h2>4. Fine-Tuning</h2>
        <p style={{ color: "#888", fontSize: 13 }}>
          Train a custom model on your data via 0G Compute. Upload a dataset,
          create a fine-tuning task, and monitor progress — all on decentralized
          GPU infrastructure.
        </p>

        {/* 4a. List FT Providers */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <strong>Step A — Discover Fine-Tuning Providers</strong>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleFTListServices}
              disabled={loading === "ft-services"}
            >
              {loading === "ft-services"
                ? "Fetching..."
                : "List FT Providers"}
            </button>
            <button
              onClick={handleFTListModels}
              disabled={loading === "ft-models"}
              style={{ marginLeft: 8 }}
            >
              {loading === "ft-models" ? "Fetching..." : "List Models"}
            </button>
          </div>
          {ftServicesResult && !ftServicesResult.services && (
            <ResultBlock data={ftServicesResult} />
          )}
          {ftServices.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f1f5f9",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                      Models
                    </th>
                    <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                      Provider
                    </th>
                    <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                      Price/Token
                    </th>
                    <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                      Status
                    </th>
                    <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ftServices.map((s, i) => (
                    <tr key={i}>
                      <td
                        style={{
                          padding: 6,
                          border: "1px solid #e2e8f0",
                          fontWeight: "bold",
                        }}
                      >
                        {s.models.join(", ") || "—"}
                      </td>
                      <td
                        style={{
                          padding: 6,
                          border: "1px solid #e2e8f0",
                          fontSize: 10,
                          wordBreak: "break-all",
                        }}
                      >
                        {s.provider}
                      </td>
                      <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                        {s.pricePerToken}
                      </td>
                      <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                        {s.occupied ? "Busy" : "Available"}
                      </td>
                      <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>
                        <button
                          onClick={() => setFtProvider(s.provider)}
                          style={{ fontSize: 11 }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
                {ftServices.length} provider(s) found
              </p>
            </div>
          )}
          {ftModels && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 12 }}>Available Models:</strong>
              <ResultBlock data={ftModels} />
            </div>
          )}
        </div>

        {/* 4b. Create Task */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <strong>Step B — Create Fine-Tuning Task</strong>
          <div style={{ marginTop: 8 }}>
            <label>
              Provider:{" "}
              <input
                value={ftProvider}
                onChange={(e) => setFtProvider(e.target.value)}
                placeholder="0x..."
                style={{ width: 380, fontFamily: "monospace", fontSize: 11 }}
              />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Model:{" "}
              <input
                value={ftModel}
                onChange={(e) => setFtModel(e.target.value)}
                style={{ width: 300, fontFamily: "monospace", fontSize: 12 }}
              />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Training Dataset (JSON array of {"{instruction, input, output}"}):
              <br />
              <textarea
                value={ftDataset}
                onChange={(e) => setFtDataset(e.target.value)}
                style={{
                  width: "100%",
                  height: 160,
                  fontFamily: "monospace",
                  fontSize: 11,
                  marginTop: 4,
                }}
              />
            </label>
          </div>
          <button
            onClick={handleFTCreateTask}
            disabled={loading === "ft-create"}
            style={{ marginTop: 8 }}
          >
            {loading === "ft-create"
              ? "Uploading & Creating..."
              : "Upload Dataset & Create Task"}
          </button>
          {ftCreateResult && <ResultBlock data={ftCreateResult} />}
        </div>

        {/* 4c. Monitor Task */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <strong>Step C — Monitor Task</strong>
          <div style={{ marginTop: 8 }}>
            <label>
              Task ID:{" "}
              <input
                value={ftTaskId}
                onChange={(e) => setFtTaskId(e.target.value)}
                placeholder="(auto-filled after create)"
                style={{ width: 300, fontFamily: "monospace", fontSize: 11 }}
              />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => handleFTGetTask("status")}
              disabled={loading === "ft-status"}
            >
              {loading === "ft-status" ? "Checking..." : "Get Task Status"}
            </button>
            <button
              onClick={() => handleFTGetTask("list")}
              disabled={loading === "ft-list"}
              style={{ marginLeft: 8 }}
            >
              {loading === "ft-list" ? "Loading..." : "List All Tasks"}
            </button>
            <button
              onClick={() => handleFTGetTask("log")}
              disabled={loading === "ft-log"}
              style={{ marginLeft: 8 }}
            >
              {loading === "ft-log" ? "Loading..." : "Get Training Log"}
            </button>
          </div>
          {ftTaskResult && <ResultBlock data={ftTaskResult} />}
          {ftLogResult && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 12 }}>Training Log:</strong>
              <ResultBlock data={ftLogResult} />
            </div>
          )}
        </div>
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* How SPARK uses 0G Compute */}
      <section style={{ margin: "24px 0" }}>
        <h2>How SPARK Uses 0G Compute</h2>
        <pre
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: 16,
            fontSize: 12,
            overflow: "auto",
          }}
        >
          {`Semantic Search (Inference):
  Bot queries "stripe webhook configuration"
  → 0G Compute generates embedding
  → Similarity search against knowledge embeddings
  → Returns ranked results by relevance + reputation

SPARK Planner (Inference):
  Complex task → 0G Compute decomposes it
  → Recommends which agents to hire
  → Estimates cost, time, risk
  → Output drives real $SPARK payments

Knowledge Quality Scoring (Inference):
  New submission → 0G Compute classifies
  → Duplicate detection via semantic similarity
  → Domain routing to correct validator pool

Domain Relevance Model (Fine-tuning):
  Train on SPARK knowledge data
  → Before: generic model → mediocre retrieval
  → After: SPARK-tuned → understands "SDK bug" vs "deployment tip"`}
        </pre>
      </section>
    </div>
  );
}

function ResultBlock({ data }: { data: ApiResult }) {
  return (
    <pre
      style={{
        background: data.success ? "#f0fdf4" : "#fef2f2",
        border: `1px solid ${data.success ? "#86efac" : "#fca5a5"}`,
        padding: 12,
        marginTop: 8,
        overflow: "auto",
        fontSize: 13,
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
