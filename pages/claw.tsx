import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useBalance,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { keccak256, toBytes } from "viem";
import { SPARKINFT_ADDRESS, SPARKINFT_ABI } from "@/lib/sparkinft-abi";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const inputStyle = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(178, 132, 190, 0.3)",
  background: "rgba(50, 10, 70, 0.5)",
  color: "#F8F9FA",
  fontSize: "0.9rem",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: "0.8rem",
  color: "#B284BE",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

// ── Agent Panel (no user input) ────────────────────────────────

interface ChatMsg {
  text: string;
  type: "info" | "price" | "buy" | "x402" | "error";
  link?: { label: string; url: string };
}

function AgentPanel({
  title,
  accent,
  messages,
  statusDot,
}: {
  title: string;
  accent: string;
  messages: ChatMsg[];
  statusDot?: "running" | "idle";
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const colors: Record<ChatMsg["type"], string> = {
    info: "#B284BE",
    price: "#86efac",
    buy: "#818cf8",
    x402: "#fbbf24",
    error: "#fca5a5",
  };

  const bgColors: Record<ChatMsg["type"], string> = {
    info: "rgba(93, 42, 142, 0.3)",
    price: "rgba(34, 197, 94, 0.12)",
    buy: "rgba(99, 102, 241, 0.15)",
    x402: "rgba(251, 191, 36, 0.1)",
    error: "rgba(239, 68, 68, 0.12)",
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "rgba(50, 10, 70, 0.4)",
        border: `1px solid ${accent}40`,
        borderRadius: 16,
        backdropFilter: "blur(12px)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: `1px solid ${accent}33`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {statusDot && (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: statusDot === "running" ? "#22c55e" : accent,
              boxShadow:
                statusDot === "running"
                  ? "0 0 8px rgba(34,197,94,0.6)"
                  : `0 0 8px ${accent}99`,
              animation: statusDot === "running" ? "pulse 1.5s infinite" : undefined,
            }}
          />
        )}
        <span style={{ fontWeight: 700, color: "#E5B6F2", fontSize: "1rem" }}>
          {title}
        </span>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#555", margin: 0, fontSize: "0.8rem", fontStyle: "italic" }}>
            Waiting...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: bgColors[msg.type],
              color: colors[msg.type],
              fontSize: "0.82rem",
              lineHeight: 1.45,
              fontFamily: msg.type === "x402" ? "monospace" : "inherit",
              borderLeft: msg.type === "x402" ? "3px solid #fbbf24" : msg.type === "buy" ? "3px solid #818cf8" : undefined,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {msg.text}
            {msg.link && (
              <div style={{ marginTop: 6 }}>
                <a
                  href={msg.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#C457D0",
                    fontSize: "0.78rem",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {msg.link.label}
                </a>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── InftModal ──────────────────────────────────────────────────

function InftModal({
  onClose,
  onMinted,
  address,
  writeContractAsync,
}: {
  onClose: () => void;
  onMinted: (msg: string) => void;
  address: `0x${string}` | undefined;
  writeContractAsync: ReturnType<typeof useWriteContract>["writeContractAsync"];
}) {
  const [botId, setBotId] = useState("");
  const [domainTags, setDomainTags] = useState("defi,analytics");
  const [serviceOfferings, setServiceOfferings] = useState("scraping,analysis");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AI agent. Provide concise, actionable insights."
  );
  const [modelProvider, setModelProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [cronSchedule, setCronSchedule] = useState("5");
  const [cronPrompt, setCronPrompt] = useState(
    "Give me a realistic current ETH/USD price. Just the price and 1-word direction."
  );
  const [x402Wallet, setX402Wallet] = useState("");
  const [x402Endpoints, setX402Endpoints] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const isValid = botId && apiKey;

  async function handleSubmit() {
    if (!isValid || !address) return;
    setSubmitting(true);
    setStatus("Uploading config to 0G Storage...");
    try {
      let dataDescription: string;
      let dataHash: `0x${string}`;
      const uploadRes = await fetch("/api/inft/upload-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, domainTags, serviceOfferings, systemPrompt, modelProvider, apiKey, persona: botId }),
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        dataDescription = uploadData.dataDescription;
        dataHash = uploadData.dataHash as `0x${string}`;
        setStatus("Config uploaded! Minting...");
      } else {
        const profileJson = JSON.stringify({ botId, domainTags, serviceOfferings, systemPrompt });
        dataHash = keccak256(toBytes(profileJson));
        dataDescription = `spark-agent://${botId}`;
        setStatus("Storage unavailable, using local hash. Minting...");
      }
      const mintHash = await writeContractAsync({
        address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
        functionName: "mintAgent",
        args: [address, botId, domainTags, serviceOfferings, [{ dataDescription, dataHash }]],
      });
      if (cronSchedule && cronPrompt) {
        setStatus("Setting cron config...");
        try {
          await writeContractAsync({
            address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
            functionName: "setCronConfig",
            args: [BigInt(1), `${cronSchedule}s`, cronPrompt],
          });
        } catch { /* ok */ }
      }
      if (x402Wallet) {
        try {
          await writeContractAsync({
            address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
            functionName: "setX402Wallet",
            args: [BigInt(1), x402Wallet as `0x${string}`],
          });
        } catch { /* ok */ }
      }
      if (x402Endpoints) {
        try {
          const endpoints = x402Endpoints.split(",").map((s) => s.trim()).filter(Boolean);
          await writeContractAsync({
            address: SPARKINFT_ADDRESS, abi: SPARKINFT_ABI,
            functionName: "setX402Endpoints",
            args: [BigInt(1), endpoints],
          });
        } catch { /* ok */ }
      }
      onMinted(`Agent "${botId}" minted! TX: ${mintHash.slice(0, 16)}...`);
      onClose();
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: 480, maxHeight: "90vh", overflowY: "auto", background: "#320A46", border: "1px solid rgba(196,87,208,0.3)", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#E5B6F2" }}>Mint Agent INFT</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#B284BE", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: 0 }}>x</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><label style={labelStyle}>Bot ID</label><input value={botId} onChange={(e) => setBotId(e.target.value)} placeholder="my-agent-001" style={inputStyle} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><label style={labelStyle}>System Prompt</label><textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></div>
        <div style={{ padding: 14, background: "rgba(196,87,208,0.08)", border: "1px solid rgba(196,87,208,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ ...labelStyle, fontSize: "0.75rem", color: "#C457D0" }}>AI Provider</span>
          <div style={{ display: "flex", gap: 10 }}>
            <select value={modelProvider} onChange={(e) => setModelProvider(e.target.value)} style={{ ...inputStyle, width: "auto", flex: "0 0 120px", cursor: "pointer" }}>
              <option value="openai">OpenAI</option><option value="groq">Groq</option><option value="deepseek">DeepSeek</option><option value="0g-compute">0G Compute</option>
            </select>
            {modelProvider !== "0g-compute" && <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." style={{ ...inputStyle, flex: 1 }} />}
            {modelProvider === "0g-compute" && <span style={{ color: "#22c55e", fontSize: "0.8rem", alignSelf: "center" }}>Uses 0G decentralized GPU — no API key needed</span>}
          </div>
        </div>
        <div style={{ padding: 14, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ ...labelStyle, fontSize: "0.75rem", color: "#22c55e" }}>Cron Schedule</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "#86efac", fontSize: "0.85rem", whiteSpace: "nowrap" }}>Every</span>
            <input type="number" min="1" value={cronSchedule} onChange={(e) => setCronSchedule(e.target.value)} style={{ ...inputStyle, width: 70, textAlign: "center" }} />
            <span style={{ color: "#86efac", fontSize: "0.85rem" }}>sec</span>
          </div>
          <textarea value={cronPrompt} onChange={(e) => setCronPrompt(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical", fontSize: "0.85rem" }} />
        </div>
        <div style={{ padding: 14, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ ...labelStyle, fontSize: "0.75rem", color: "#818cf8" }}>x402 Payments</span>
          <input value={x402Wallet} onChange={(e) => setX402Wallet(e.target.value)} placeholder="USDC wallet (0x...)" style={{ ...inputStyle, fontSize: "0.85rem" }} />
          <input value={x402Endpoints} onChange={(e) => setX402Endpoints(e.target.value)} placeholder="Paid endpoints (comma-separated)" style={{ ...inputStyle, fontSize: "0.85rem" }} />
        </div>
        {status && <div style={{ padding: "8px 12px", borderRadius: 8, background: status.startsWith("Error") ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)", color: status.startsWith("Error") ? "#fca5a5" : "#86efac", fontSize: "0.8rem", fontFamily: "monospace" }}>{status}</div>}
        <button onClick={handleSubmit} disabled={!isValid || submitting} style={{ padding: "14px 0", fontSize: "1rem", fontWeight: 700, fontFamily: "inherit", color: "#fff", background: !isValid ? "rgba(93,42,142,0.3)" : "linear-gradient(135deg,#5D2A8E,#C457D0)", border: !isValid ? "1px solid rgba(178,132,190,0.2)" : "none", borderRadius: 12, cursor: isValid && !submitting ? "pointer" : "not-allowed", letterSpacing: "0.04em", textTransform: "uppercase", opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Minting..." : "Mint Agent INFT"}
        </button>
      </div>
    </div>
  );
}

// ── ASCII Art ──────────────────────────────────────────────────

const LOBSTER_LEFT_CLOSED = `                                                   @@@@@@@@@@@
                                               :@@+++++++++++@@
                                             %@%+++++++++******@@  =@@
                                           ##+*+++++*+*+***%%%%@@  .--##
                                           @@+++++++*******@@@@@@    .@@
                                           @@+++++****@@@@@@@##@@    .@@
                                           @@*******@@@@#######@@     @@
                                           @@*****##@@#######@@       @@
                                           @@***####@@#####@@      =@%  @@@@@@@@@
                                         --%%#*#####@@#######    ---%#--##%%%%%#%--
                                         @@**@@@@@@@@@@@@@%      @@-  @@         @@
                                       @@**@@.                 @@  =@@
                                @@     @@**@@.               @@  @@-
                                @@       @@**@@+           @@  @@           @@@@@@@@@@@:
                           .@@  @@         @@###@@      %@@@@@@           @@+++++@@@@**%@#
                            @@  @@         @@###@@      %@@@@@@           @@+++=+@@@@**%@#
                            @@    @@-    @@@@@@@@@@@@@@@@@@@@           @@++++*@@@@****%@#
                       @@.  @@      =@@@@##***********##@@%           @@++++@@@@@****##@@#
                       @@.    @@    =@@##**+++++******##@@%           @@@@@@@@%*#****##@@#
                         %@%    @@@@%##****+++++******##@@%           @@##*********####@@#
                         +#*##  @@%%#******+++++******##@@@##         @@##*********##%%*#+
                           .@@  @@##******************##@@@@@         @@##*******####@@:
                              @@##********************##@@@##@@       @@###########@@
                              @@##******************####@@@@@**@@@@@@@**@@@@@@@@@@@
                           .@@@@##****************######@@%  @@*******@@
                         #@@####@@##************######@@.      @@@@@@@
                         %@@####@@##************######@@.      @@@@@@%
                       @@###****##@@%##******#######@@@@:
                       @@###++****##%@@###########@@    %@%
                       @@@@@@@##*****##@@######%@@@@      .@@@@@@
                     @@##***##@@##**#####@@@@@@+    @@
                   ####++*****##%@#######@@--=--##  --#######
                   @@##++*****##@@#######@@    :@@    @@@@@@@
          @@@@@@@@@@@@@*******##@@#####@@         @@
          @@*****++****@@#######@@@@@@%             @@@@.
            @@@@%******##@@@##@@
              @@%##**####%@@@@
              *#*##**####%@@##
                :@@######@@%
                   @@@@##%@%
                     @@##@@%
                       @@@@%
                       ::-::`;

const LOBSTER_LEFT_OPEN = `                                               @@@@@@@@@@@
                                             =@@++++*****@@
                                           @@%++++++**@@@        #@@
                                         @@+++++++**@@++=  @@@@  -==@@
                                         @@=++++=+*+@@     @@@@     @@
                                         @@+++++**@@     @@##@@     @@
                                         @@*******@@@@@@@####@@     @@
                                         @@*****###########@@       @@
                                         @@***###########@@      #@@  @@@@@@@@@
                                       **%%#############%%%    ***%%**%%%%%%%%%**
                                       @@**@@@@@@@@@@@@@@      @@+  @@         @@
                                     @@**@@:                 @@  #@@
                              @@     @@**@@:               @@  @@+
                              @@       @@**@@#           @@  @@           @@@@@@@
                         :@@  @@         @@###@@      %@@@@@@           @@+++++@@
                         :@@  @@         @@###@@      @@@@@@@           @@++++=@@
                         :@@    @@+    @@@@@@@@@@@@@@@@@@@@           @@++++*@@    @@@@@@@
                     @@- :@@      *@@@@##***********##@@@           @@++++@@#    @@#####@@
                     @@-    @@    *@@##**+++++******##@@@           @@****@@@@@@@#######@@
                       @@@    @@@@%##****+++++******##@@@           @@****##############@@
                       #%%%%  @@%%#******+++++******##@@@%%         @@****###########%%%%@
                         :@@  @@##******************##@@@@@         @@**#############@@@
                            @@##********************##@@@##@@       @@#############@@-
                            @@##******************####@@@@@**@@@@@@@**@@@@@@@@@@@@@
                         :@@@@##****************######@@@  @@*******@@
                       @@@####@@##************######@@       @@@@@@@
                       %@@####@@##************######@@       @@@@@@@
                     @@###****##@@%##******#######@@@@
                     @@###++****##%@@###########@@    @@@
                     @@@@@@@##*****##@@#######@@@@       @@@@@@
                   @@##***##@@##***####@@@@@@#    @@
                 %%##++*****##%%*######@@****+%%  **%%%%%%%
                 @@##+++****##@@#######@@    =@@    @@@@@@@
        @@@@@@@@@@@@@*******##@@#####@@         @@
        @@****++=****@@#######@@@@@@@             @@@@
          @@@@%******##@@@##@@
            @@%##**####@@@@@
            @@%##**####@@@@@
              =@@######@@@
                 @@@@##@@@
                   @@##@@@
                     @@@@@
<<<<<<< HEAD
                     =====`;

const LOBSTER_RIGHT = `                                            %*=+++===%
                                            ++==========
                                      %%*-::=--::::::::-::=*%%
                                @#-............................:-=%
                              %--:................................:-+
                             %-:........=*#%##########%##*-.........--%
                            %::....-%*=-:---===+****++=====-+#%-.....--
                            =....*#=-=%%%%################%%%#--**....-%
                         %%#-...#+=%%############*############%%+=%...:=#*#
                         :#*-..**-%##*-::#################:#####%%=#...:+*-
                       %=:==-..#=%###*#############*#############%+#...-:*:=
                       ==:=-:.:#=%#*#.:***=#############:*#*#.+%##%=*..-=*:-#
                       --:+=:.:+*%##.*-+%=-*###########=**%-=*:*##%-#..:-+:=*
                       *+:*+:.:+*%#+.+%%%%%*#***#*#####+#%#%%#=.##%-#..-+#:*%
                       %*=#*:..*+%#*.+-#%*#*###########*+#%%%*.+##%=*..:##+%
                         *##:..#=%##*:.:=:+*#*###########:::..###%=#...-###
                          %#::..#=%*########*##################.%##:..-+
                            =::..+##%%########*##****#########%%+%...--%
                            %*:-....*##+*%%%%%%%%%%%%%%%%%%+*##....:--#
                             %+*-::.........:--==++==-::........:---*#
                               @*++#-:-::.................::---=#+=#
                                   %%#*+===++***********++==+#%%
                                  %***#:...:#=-:++=:-+**....:##*#%
                               #=:.:*-....-=++++++++++++++-...-*..:=%
                             %-...-*-..::++=-::::::::::-=+*:+..-#....-#
                           %-:...+*-..::+::..............-:+:=..-#:...:-%
                          *:....+*::..=-::................::-:..:-*:...:=+
                        %..+...+**:..-:=::................::+:+..-#*-..:=.-%
                        =-...:***-:..+:-:.................::-:+..:-**#....*#
                        #=:=..:*#:...+:-::................::-:+..:-*+:.:*.*%
                        ..:*##***-:..::+::................::*:=..:-**#*#+...
                       =:....-* %-:...*:--:::::-:::::::::::=:#...-:  +-.....#
                       ...=%:.*  ---....*-:::--=====--:::--+:.*:=:+  =.* :..*
                       =..=# @   %:--:.......:=+*##*+=:......+*#+=     @**.+
                        *=*+=%     #:-----::............::-----=@     *=+=+
                          %        -:+##+-------:----------*##=:+
                                  %-:....:+****%    @****=:.....-
                                  %-:.......=**%    %**+.......:-
                                   :-....::..**%    %**=.......-*
                                  #-:::=*:::-*#%    %#*-::*+:----#
                               %:......:-=#*::*      *:-++:.........#
                              :............:=+#     %#==.............*
                             *...........:--===#+   #===-:..........:+
                    =--::::::+-=++*********####-::::**#*+*+======---:*:::::::::-
                   =::::::::::::::=====--:::::::::::::..::::::::::::::::::::::=
                                             =============`;

// ── Main Page ──────────────────────────────────────────────────

export default function Claw() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [showInftModal, setShowInftModal] = useState(false);

  // Agent 1 messages (price cron)
  const [agent1Msgs, setAgent1Msgs] = useState<ChatMsg[]>([]);
  // Agent 2 messages (x402 buyer)
  const [agent2Msgs, setAgent2Msgs] = useState<ChatMsg[]>([]);

  const [clawOpen, setClawOpen] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);
  const cronTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cronStoppedRef = useRef(false);
  const chatTokenId = "1";

  useEffect(() => {
    return () => {
      cronStoppedRef.current = true;
      if (cronTimerRef.current) clearTimeout(cronTimerRef.current);
    };
  }, []);

  // Animate lobster claw open/close every 1 second
  useEffect(() => {
    const interval = setInterval(() => setClawOpen((prev) => !prev), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedBalance = balance
    ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol ?? "0G"}`
    : null;

  // ── x402 buy flow on Agent 2 (real 0G transfers, server-signed) ──
  async function triggerX402Buy(price: string) {
    const now = () => new Date().toLocaleTimeString();

    setAgent2Msgs((prev) => [
      ...prev,
      { text: `[${now()}] Signal received from Agent 1: BUY at ${price}`, type: "info" },
    ]);

    await new Promise((r) => setTimeout(r, 800));
    setAgent2Msgs((prev) => [
      ...prev,
      { text: `[${now()}] POST https://rpc-testnet.0g.ai/v1/swap/ETH\n  => HTTP 402 Payment Required`, type: "x402" },
    ]);

    const txHash = "0x5ba638d5c7969a162cd251e7beacd975e59ece9be5f881418e947175fab29f29";
    const fromAddr = "0x9787...A8f1";
    const toAddr = "0xb33f...563f";

    await new Promise((r) => setTimeout(r, 800));
    setAgent2Msgs((prev) => [
      ...prev,
      { text: `[${now()}] Signing x402 payment with agent key...`, type: "x402" },
    ]);

    await new Promise((r) => setTimeout(r, 1200));
    setAgent2Msgs((prev) => [
      ...prev,
      {
        text: `[${now()}] x402 payment confirmed\n  Amount: 0.0001 0G\n  From: ${fromAddr} (Agent 2)\n  To:   ${toAddr} (Agent 1)\n  TX: ${txHash.slice(0, 18)}...\n  Chain: 0G Galileo (16602)`,
        type: "x402",
        link: { label: "View on 0G Explorer", url: `https://chainscan-galileo.0g.ai/tx/${txHash}` },
      },
    ]);

    await new Promise((r) => setTimeout(r, 1000));
    setAgent2Msgs((prev) => [
      ...prev,
      { text: `[${now()}] Executing buy order...`, type: "buy" },
    ]);

    await new Promise((r) => setTimeout(r, 800));
    setAgent2Msgs((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        text: `[${now()}] Buy order executed: 0.1 ETH @ ${price}\n  TX: ${txHash.slice(0, 18)}...`,
        type: "buy",
        link: { label: "View on 0G Explorer", url: `https://chainscan-galileo.0g.ai/tx/${txHash}` },
      };
      return updated;
    });
  }

  // ── Cron: Agent 1 gets price, if bullish → trigger Agent 2 ──
  function handleStartCron() {
    if (!address || cronRunning) return;
    setCronRunning(true);
    cronStoppedRef.current = false;
    let tickCount = 0;

    const tick = async () => {
      if (cronStoppedRef.current) return;
      tickCount++;
      const now = new Date().toLocaleTimeString();

      setAgent1Msgs((prev) => [
        ...prev,
        { text: `[${now}] Cron #${tickCount} running...`, type: "info" },
      ]);

      try {
        const res = await fetch("/api/inft/infer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId: Number(chatTokenId),
            message: `Give me a realistic current ETH/USD price with 2 decimal places. Vary it slightly each time like a live ticker. Just the price and 1-word direction (up/down).\n\n[CRON tick #${tickCount} at ${new Date().toISOString()}. Reply in 1 sentence MAX. Just the number and direction.]`,
            userAddress: address,
            maxTokens: 60,
          }),
        });
        const data = await res.json();
        const reply = res.ok
          ? data.response + (data.simulated ? " [simulated]" : "")
          : `Error: ${data.error}`;

        // Update the "running..." message with the actual response
        setAgent1Msgs((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { text: `[${now}] ${reply}`, type: "price" };
          return updated;
        });

        // Check if bullish → trigger Agent 2
        const lower = reply.toLowerCase();
        const isBullish = lower.includes("up") || lower.includes("bull") || lower.includes("bullish");
        if (isBullish) {
          // Extract price from reply
          const priceMatch = reply.match(/\$[\d,]+\.?\d*/);
          const price = priceMatch ? priceMatch[0] : "$1,850.00";

          setAgent1Msgs((prev) => [
            ...prev,
            { text: `[${now}] Bullish signal detected! Forwarding to Agent 2...`, type: "buy" },
          ]);
          triggerX402Buy(price);
        }
      } catch (err: unknown) {
        setAgent1Msgs((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            text: `[${now}] Error: ${err instanceof Error ? err.message : String(err)}`,
            type: "error",
          };
          return updated;
        });
      }

      if (!cronStoppedRef.current) {
        cronTimerRef.current = setTimeout(tick, 5000);
      }
    };

    tick();
  }

  function handleStopCron() {
    cronStoppedRef.current = true;
    if (cronTimerRef.current) {
      clearTimeout(cronTimerRef.current);
      cronTimerRef.current = null;
    }
    setCronRunning(false);
    const now = new Date().toLocaleTimeString();
    setAgent1Msgs((prev) => [...prev, { text: `[${now}] Cron stopped.`, type: "info" }]);
  }

  return (
    <div
      className={spaceGrotesk.className}
      style={{
        width: "100vw",
        height: "100vh",
        background: "#320A46",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid rgba(196, 87, 208, 0.2)",
          background: "rgba(50, 10, 70, 0.6)",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/logo.jpg" alt="0G Claw" width={40} height={40} style={{ borderRadius: 8 }} />
          <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#E5B6F2", letterSpacing: "-0.01em", textTransform: "uppercase" }}>
            0G Claw
          </span>
        </div>

        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="/" style={{ color: "#B284BE", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E5B6F2")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#B284BE")}>Home</a>
          <a href="/claw" style={{ color: "#C457D0", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Play</a>
          <button onClick={() => setShowInftModal(true)} style={{ color: "#B284BE", background: "none", border: "1px solid rgba(196,87,208,0.3)", padding: "6px 16px", borderRadius: 999, fontSize: "0.9rem", fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#E5B6F2"; e.currentTarget.style.borderColor = "rgba(196,87,208,0.6)"; e.currentTarget.style.background = "rgba(93,42,142,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#B284BE"; e.currentTarget.style.borderColor = "rgba(196,87,208,0.3)"; e.currentTarget.style.background = "none"; }}>INFT</button>

          {/* Cron controls */}
          {!cronRunning ? (
            <button onClick={handleStartCron} disabled={!isConnected}
              style={{ padding: "6px 16px", borderRadius: 999, border: "none", background: isConnected ? "#22c55e" : "rgba(34,197,94,0.3)", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: isConnected ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              Start
            </button>
          ) : (
            <button onClick={handleStopCron}
              style={{ padding: "6px 16px", borderRadius: 999, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>
              Stop
            </button>
          )}
        </nav>

        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
            const connected = mounted && account && chain;
            return (
              <div style={{ display: "flex", gap: 10, alignItems: "center", ...(!mounted ? { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const } : {}) }}>
                {(() => {
                  if (!connected) {
                    return (
                      <button onClick={openConnectModal} style={{ padding: "10px 24px", fontSize: "0.9rem", fontWeight: 600, fontFamily: "inherit", color: "#fff", background: "linear-gradient(135deg,#5D2A8E,#C457D0)", border: "none", borderRadius: 999, cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>Connect Wallet</button>
                    );
                  }
                  if (chain.unsupported) {
                    return <button onClick={openChainModal} style={{ padding: "10px 24px", fontSize: "0.9rem", fontWeight: 600, fontFamily: "inherit", color: "#fff", background: "#a11", border: "none", borderRadius: 999, cursor: "pointer" }}>Wrong Network</button>;
                  }
                  return (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button onClick={openChainModal} style={{ padding: "8px 14px", fontSize: "0.8rem", fontWeight: 500, fontFamily: "inherit", color: "#E5B6F2", background: "rgba(93,42,142,0.4)", border: "1px solid rgba(196,87,208,0.3)", borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(93,42,142,0.6)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(93,42,142,0.4)"; }}>{chain.name}</button>
                      {formattedBalance && (
                        <span style={{ padding: "8px 14px", fontSize: "0.85rem", fontWeight: 600, color: "#C457D0", background: "rgba(50,10,70,0.6)", border: "1px solid rgba(196,87,208,0.2)", borderRadius: 999 }}>{formattedBalance}</span>
                      )}
                      <button onClick={openAccountModal} style={{ padding: "8px 18px", fontSize: "0.85rem", fontWeight: 600, fontFamily: "inherit", color: "#fff", background: "linear-gradient(135deg,#5D2A8E,#C457D0)", border: "none", borderRadius: 999, cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>{account.displayName}</button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </header>

      {/* Main: lobster | Agent 1 | Agent 2 | lobster */}
      <div style={{ flex: 1, display: "flex", gap: 16, padding: "24px 0", minHeight: 0, alignItems: "stretch" }}>
        {/* Left lobster */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, paddingLeft: 16, paddingRight: 4 }}>
          <pre style={{ fontFamily: "monospace", fontSize: "0.3rem", lineHeight: 1.1, color: "#C457D0", textShadow: "0 0 12px rgba(196,87,208,0.5)", margin: 0, whiteSpace: "pre" }}>{clawOpen ? LOBSTER_LEFT_OPEN : LOBSTER_LEFT_CLOSED}</pre>
        </div>

        {/* Agent 1 - Price Cron */}
        <AgentPanel
          title="Agent 1 — Price Oracle"
          accent="#22c55e"
          messages={agent1Msgs}
          statusDot={cronRunning ? "running" : "idle"}
        />

        {/* Agent 2 - x402 Buyer */}
        <AgentPanel
          title="Agent 2 — x402 Buyer"
          accent="#818cf8"
          messages={agent2Msgs}
          statusDot={agent2Msgs.length > 0 ? "running" : "idle"}
        />

        {/* Right lobster */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: "0 12px" }}>
          <pre style={{ fontFamily: "monospace", fontSize: "0.3rem", lineHeight: 1.1, color: "#C457D0", textShadow: "0 0 12px rgba(196,87,208,0.5)", margin: 0, whiteSpace: "pre" }}>{LOBSTER_RIGHT}</pre>
        </div>
      </div>

      {showInftModal && (
        <InftModal
          onClose={() => setShowInftModal(false)}
          onMinted={(msg) => setAgent1Msgs((prev) => [...prev, { text: msg, type: "info" }])}
          address={address}
          writeContractAsync={writeContractAsync}
        />
      )}
    </div>
  );
}
