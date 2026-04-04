import type { NextApiRequest, NextApiResponse } from "next";
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const zgTestnet = defineChain({
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { to, amount } = req.body;
  const pk = process.env.ZG_STORAGE_PRIVATE_KEY;
  if (!pk) return res.status(500).json({ error: "No private key configured" });

  try {
    const account = privateKeyToAccount(`0x${pk}`);
    const walletClient = createWalletClient({
      account,
      chain: zgTestnet,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: zgTestnet,
      transport: http(),
    });

    const txHash = await walletClient.sendTransaction({
      to: (to || account.address) as `0x${string}`,
      value: parseEther(amount || "0.0001"),
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return res.status(200).json({
      success: true,
      txHash,
      from: account.address,
      to: to || account.address,
      amount: amount || "0.0001",
    });
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
