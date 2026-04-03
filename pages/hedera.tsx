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

export default function HederaPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Hedera SDK Test Page</h1>
        <p className="text-gray-400 mb-8">
          Test Account, HTS Token, HCS Topic, and Scheduled Transaction operations
          on Hedera Testnet.
        </p>

        <CreateAccount />
        <CreateToken />
        <CreateTopic />
        <ScheduleTransaction />
      </div>
    </div>
  );
}
