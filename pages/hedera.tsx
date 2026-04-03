import { useState } from "react";

type Result = Record<string, unknown> | null;

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

function CreateAccount() {
  const [balance, setBalance] = useState("10");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hedera/create-account", {
        initialBalance: Number(balance),
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  };

  return (
    <Section title="1. Create Account">
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Initial Balance (HBAR)
          </label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-32 text-white"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

function CreateToken() {
  const [name, setName] = useState("TestToken");
  const [symbol, setSymbol] = useState("TT");
  const [supply, setSupply] = useState("1000");
  const [decimals, setDecimals] = useState("2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hedera/create-token", {
        tokenName: name,
        tokenSymbol: symbol,
        initialSupply: Number(supply),
        decimals: Number(decimals),
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  };

  return (
    <Section title="2. Create Token (HTS)">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Token Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Symbol</label>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Initial Supply
          </label>
          <input
            type="number"
            value={supply}
            onChange={(e) => setSupply(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Decimals</label>
          <input
            type="number"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium"
      >
        {loading ? "Creating..." : "Create Token"}
      </button>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

function CreateTopic() {
  const [memo, setMemo] = useState("Prediction Market Audit Log");
  const [topicId, setTopicId] = useState("");
  const [message, setMessage] = useState('{"event":"market_created","id":"1"}');
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [msgResult, setMsgResult] = useState<Result>(null);
  const [error, setError] = useState("");
  const [msgError, setMsgError] = useState("");

  const handleCreateTopic = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hedera/create-topic", { memo });
      setResult(data);
      if (data.topicId) setTopicId(data.topicId as string);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  };

  const handleSubmitMessage = async () => {
    setMsgLoading(true);
    setMsgError("");
    setMsgResult(null);
    try {
      const data = await callApi("/api/hedera/submit-message", {
        topicId,
        message,
      });
      setMsgResult(data);
    } catch (e: unknown) {
      setMsgError(e instanceof Error ? e.message : "Unknown error");
    }
    setMsgLoading(false);
  };

  return (
    <Section title="3. HCS Topic + Message">
      <div className="flex gap-3 items-end mb-4">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">Topic Memo</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <button
          onClick={handleCreateTopic}
          disabled={loading}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium"
        >
          {loading ? "Creating..." : "Create Topic"}
        </button>
      </div>
      <ResultBox result={result} error={error} />

      <hr className="border-gray-700 my-4" />

      <div className="flex gap-3 items-end">
        <div className="w-48">
          <label className="block text-sm text-gray-400 mb-1">Topic ID</label>
          <input
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            placeholder="0.0.xxxxx"
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">Message</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <button
          onClick={handleSubmitMessage}
          disabled={msgLoading || !topicId}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium"
        >
          {msgLoading ? "Sending..." : "Submit Message"}
        </button>
      </div>
      <ResultBox result={msgResult} error={msgError} />
    </Section>
  );
}

function ScheduleTransaction() {
  const [sender, setSender] = useState("");
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("1");
  const [memo, setMemo] = useState("Scheduled HBAR transfer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hedera/schedule-transaction", {
        senderAccountId: sender,
        receiverAccountId: receiver,
        amount: Number(amount),
        memo,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  };

  return (
    <Section title="4. Schedule Transaction">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Sender Account ID
          </label>
          <input
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="0.0.xxxxx"
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Receiver Account ID
          </label>
          <input
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            placeholder="0.0.xxxxx"
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Amount (HBAR)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Memo</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white"
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading || !sender || !receiver}
        className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium"
      >
        {loading ? "Scheduling..." : "Schedule Transfer"}
      </button>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

// ── HCS-20: Auditable Points ──────────────────────────────────

function HCS20Points() {
  const [topicId, setTopicId] = useState("");
  const [name, setName] = useState("Oracle Reputation");
  const [tick, setTick] = useState("rep");
  const [max, setMax] = useState("999999999");
  const [lim, setLim] = useState("100");
  const [amt, setAmt] = useState("10");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [loading, setLoading] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const call = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hcs/hcs20", { action, ...body });
      setResult(data);
      if (data.topicId && action === "deploy") setTopicId(data.topicId as string);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading("");
  };

  return (
    <Section title="5. HCS-20: Reputation Points">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Ticker</label>
          <input value={tick} onChange={(e) => setTick(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Supply</label>
          <input value={max} onChange={(e) => setMax(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Mint Limit</label>
          <input value={lim} onChange={(e) => setLim(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
      </div>
      <button onClick={() => call("deploy", { name, tick, max, lim })} disabled={!!loading} className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium mr-2">
        {loading === "deploy" ? "Deploying..." : "Deploy Ticker"}
      </button>

      <hr className="border-gray-700 my-4" />

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Topic ID</label>
          <input value={topicId} onChange={(e) => setTopicId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount</label>
          <input value={amt} onChange={(e) => setAmt(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">To Account</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-sm text-gray-400 mb-1">From Account (burn/transfer)</label>
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => call("mint", { topicId, tick, amt, to })} disabled={!!loading || !topicId} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "mint" ? "Minting..." : "Mint"}
        </button>
        <button onClick={() => call("burn", { topicId, tick, amt, from })} disabled={!!loading || !topicId} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "burn" ? "Burning..." : "Burn"}
        </button>
        <button onClick={() => call("transfer", { topicId, tick, amt, from, to })} disabled={!!loading || !topicId} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "transfer" ? "Transferring..." : "Transfer"}
        </button>
        <button onClick={() => call("balance", { topicId })} disabled={!!loading || !topicId} className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "balance" ? "Loading..." : "Check Balance"}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

// ── HCS-2: Topic Registry ──────────────────────────────────

function HCS2Registry() {
  const [registryTopicId, setRegistryTopicId] = useState("");
  const [entryTopicId, setEntryTopicId] = useState("");
  const [uid, setUid] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const call = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hcs/hcs2", { action, ...body });
      setResult(data);
      if (data.topicId && action === "create") setRegistryTopicId(data.topicId as string);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading("");
  };

  return (
    <Section title="6. HCS-2: Market Registry">
      <button onClick={() => call("create", {})} disabled={!!loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium mb-4">
        {loading === "create" ? "Creating..." : "Create Registry"}
      </button>

      <hr className="border-gray-700 my-4" />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Registry Topic ID</label>
          <input value={registryTopicId} onChange={(e) => setRegistryTopicId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Entry Topic ID</label>
          <input value={entryTopicId} onChange={(e) => setEntryTopicId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">UID (for update/delete)</label>
          <input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="sequence #" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Memo</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="description" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => call("register", { registryTopicId, entryTopicId, memo })} disabled={!!loading || !registryTopicId} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "register" ? "Registering..." : "Register"}
        </button>
        <button onClick={() => call("update", { registryTopicId, uid, entryTopicId, memo })} disabled={!!loading || !registryTopicId || !uid} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "update" ? "Updating..." : "Update"}
        </button>
        <button onClick={() => call("delete", { registryTopicId, uid, memo })} disabled={!!loading || !registryTopicId || !uid} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "delete" ? "Deleting..." : "Delete"}
        </button>
        <button onClick={() => call("read", { registryTopicId })} disabled={!!loading || !registryTopicId} className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "read" ? "Reading..." : "Read Registry"}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

// ── HCS-11: Agent Profile ──────────────────────────────────

function HCS11Profile() {
  const [topicId, setTopicId] = useState("");
  const [displayName, setDisplayName] = useState("Oracle Agent Alpha");
  const [accountId, setAccountId] = useState("");
  const [model, setModel] = useState("oracle-v1");
  const [bio, setBio] = useState("Prediction market oracle node");
  const [loading, setLoading] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const call = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hcs/hcs11", { action, ...body });
      setResult(data);
      if (data.topicId && action === "create") setTopicId(data.topicId as string);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading("");
  };

  return (
    <Section title="7. HCS-11: Agent Profile">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Display Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Account ID</label>
          <input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Model</label>
          <input value={model} onChange={(e) => setModel(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Bio</label>
          <input value={bio} onChange={(e) => setBio(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => call("create", { displayName, accountId, model, bio, capabilities: [7, 9, 16] })} disabled={!!loading || !accountId} className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "create" ? "Creating..." : "Create Profile"}
        </button>
      </div>

      <hr className="border-gray-700 my-4" />

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">Profile Topic ID</label>
          <input value={topicId} onChange={(e) => setTopicId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <button onClick={() => call("read", { topicId })} disabled={!!loading || !topicId} className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "read" ? "Reading..." : "Read Profile"}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

// ── HCS-16: Flora (Group Oracle Debate) ──────────────────────────────────

function HCS16Flora() {
  const [floraId, setFloraId] = useState("oracle-committee-1");
  const [cTopicId, setCTopicId] = useState("");
  const [sTopicId, setSTopicId] = useState("");
  const [content, setContent] = useState("Evidence suggests YES based on reuters.com source");
  const [candidateId, setCandidateId] = useState("");
  const [hash, setHash] = useState("");
  const [epoch, setEpoch] = useState("1");
  const [readTopicId, setReadTopicId] = useState("");
  const [loading, setLoading] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState("");

  const call = async (action: string, body: Record<string, unknown>) => {
    setLoading(action);
    setError("");
    setResult(null);
    try {
      const data = await callApi("/api/hcs/hcs16", { action, ...body });
      setResult(data);
      if (action === "create") {
        if (data.communicationTopicId) {
          setCTopicId(data.communicationTopicId as string);
          setReadTopicId(data.communicationTopicId as string);
        }
        if (data.stateTopicId) setSTopicId(data.stateTopicId as string);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading("");
  };

  return (
    <Section title="8. HCS-16: Flora (Group Oracle Debate)">
      <div className="flex gap-3 items-end mb-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Flora ID</label>
          <input value={floraId} onChange={(e) => setFloraId(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-48 text-white" />
        </div>
        <button onClick={() => call("create", { floraId })} disabled={!!loading} className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "create" ? "Creating..." : "Create Flora"}
        </button>
      </div>

      <hr className="border-gray-700 my-4" />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Communication Topic</label>
          <input value={cTopicId} onChange={(e) => setCTopicId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Message Content</label>
          <input value={content} onChange={(e) => setContent(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
      </div>
      <button onClick={() => call("message", { communicationTopicId: cTopicId, content })} disabled={!!loading || !cTopicId} className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium mr-2">
        {loading === "message" ? "Sending..." : "Send Message"}
      </button>

      <hr className="border-gray-700 my-4" />

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Candidate Account (vote)</label>
          <input value={candidateId} onChange={(e) => setCandidateId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div className="flex gap-2 items-end">
          <button onClick={() => call("vote", { communicationTopicId: cTopicId, candidateAccountId: candidateId, approve: true })} disabled={!!loading || !cTopicId || !candidateId} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
            Approve
          </button>
          <button onClick={() => call("vote", { communicationTopicId: cTopicId, candidateAccountId: candidateId, approve: false })} disabled={!!loading || !cTopicId || !candidateId} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
            Reject
          </button>
        </div>
      </div>

      <hr className="border-gray-700 my-4" />

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">State Topic</label>
          <input value={sTopicId} onChange={(e) => setSTopicId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">State Hash</label>
          <input value={hash} onChange={(e) => setHash(e.target.value)} placeholder="sha384..." className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Epoch</label>
          <input value={epoch} onChange={(e) => setEpoch(e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
      </div>
      <button onClick={() => call("state", { stateTopicId: sTopicId, hash: hash || "test-hash-" + Date.now(), epoch: Number(epoch) })} disabled={!!loading || !sTopicId} className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium mr-2">
        {loading === "state" ? "Updating..." : "Update State"}
      </button>

      <hr className="border-gray-700 my-4" />

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">Read Topic ID</label>
          <input value={readTopicId} onChange={(e) => setReadTopicId(e.target.value)} placeholder="0.0.xxxxx" className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-full text-white" />
        </div>
        <button onClick={() => call("read", { topicId: readTopicId })} disabled={!!loading || !readTopicId} className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium">
          {loading === "read" ? "Reading..." : "Read Messages"}
        </button>
      </div>
      <ResultBox result={result} error={error} />
    </Section>
  );
}

export default function HederaPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Hedera SDK Test Page</h1>
        <p className="text-gray-400 mb-8">
          Test Account, HTS Token, HCS Topic, Scheduled Transaction, and HCS
          Standards on Hedera Testnet.
        </p>

        <CreateAccount />
        <CreateToken />
        <CreateTopic />
        <ScheduleTransaction />

        <h2 className="text-2xl font-bold mt-12 mb-6 border-t border-gray-700 pt-8">
          HCS Standards
        </h2>

        <HCS20Points />
        <HCS2Registry />
        <HCS11Profile />
        <HCS16Flora />
      </div>
    </div>
  );
}
