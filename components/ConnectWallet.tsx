import { useAccount, useConnect, useDisconnect } from "wagmi";
import { zgTestnet } from "@/lib/wagmi";

/** Matches pages/dashboard.tsx warm palette when appearance="warm" */
const warm = {
  wrongNet: "#a65d42",
  wrongNetBg: "#f7ebe4",
  address: "#483519",
  disconnectBg: "#faf8f4",
  disconnectBorder: "#d4c4a8",
  disconnectText: "#483519",
  connectBg: "#483519",
};

export function ConnectWallet({
  appearance = "default",
}: {
  appearance?: "default" | "warm";
}) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const isWarm = appearance === "warm";

  if (isConnected) {
    const wrongNetwork = chain?.id !== zgTestnet.id;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "flex-end",
          fontFamily: isWarm
            ? 'inherit'
            : "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        }}
      >
        {wrongNetwork && (
          <span
            style={{
              color: isWarm ? warm.wrongNet : "#ef4444",
              fontSize: 12,
              fontWeight: isWarm ? 600 : undefined,
              background: isWarm ? warm.wrongNetBg : undefined,
              padding: isWarm ? "4px 10px" : undefined,
              borderRadius: isWarm ? 6 : undefined,
            }}
          >
            Wrong network — switch to 0G Galileo
          </span>
        )}
        <span
          style={{
            fontSize: 13,
            color: isWarm ? warm.address : "#666",
            fontWeight: isWarm ? 500 : undefined,
          }}
        >
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            cursor: "pointer",
            borderRadius: 8,
            fontWeight: isWarm ? 600 : undefined,
            background: isWarm ? warm.disconnectBg : "#f1f5f9",
            border: isWarm
              ? `1px solid ${warm.disconnectBorder}`
              : "1px solid #cbd5e1",
            color: isWarm ? warm.disconnectText : "inherit",
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      style={{
        padding: "8px 20px",
        fontSize: 14,
        fontFamily: isWarm
          ? "inherit"
          : "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        cursor: isPending ? "wait" : "pointer",
        background: isWarm ? warm.connectBg : "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: isWarm ? 8 : 6,
        fontWeight: isWarm ? 600 : undefined,
      }}
    >
      {isPending ? "Connecting..." : "Connect MetaMask"}
    </button>
  );
}
