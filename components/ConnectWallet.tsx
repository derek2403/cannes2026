import { useAccount, useConnect, useDisconnect } from "wagmi";
import { zgTestnet } from "@/lib/wagmi";

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    const wrongNetwork = chain?.id !== zgTestnet.id;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "monospace" }}>
        {wrongNetwork && (
          <span style={{ color: "#ef4444", fontSize: 12 }}>
            Wrong network — switch to 0G Galileo
          </span>
        )}
        <span style={{ fontSize: 13, color: "#666" }}>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            cursor: "pointer",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      style={{
        padding: "8px 20px",
        fontSize: 14,
        fontFamily: "monospace",
        cursor: isPending ? "wait" : "pointer",
        background: "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: 6,
      }}
    >
      {isPending ? "Connecting..." : "Connect MetaMask"}
    </button>
  );
}
