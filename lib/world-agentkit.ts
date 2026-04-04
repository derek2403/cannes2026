import { signRequest } from "@worldcoin/idkit/signing";
import { createAgentBookVerifier } from "@worldcoin/agentkit";
import type { RpSignature } from "@worldcoin/idkit/signing";

// ── AgentBook Verifier (singleton) ──────────────────────────────────
// Resolves wallet addresses → anonymous human IDs on World Chain mainnet
// CLI only supports mainnet registration (no testnet flag)

const WORLD_CHAIN_ID = "eip155:480";

let verifier: ReturnType<typeof createAgentBookVerifier> | null = null;

export function getAgentBookVerifier() {
  if (!verifier) {
    verifier = createAgentBookVerifier({
      rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
    });
  }
  return verifier;
}

// ── RP Context Generation ──────────────────────────────────
// Backend signs a challenge for the IDKit widget (prevents impersonation)

export function generateRpContext(action: string) {
  const rpId = process.env.WORLD_RP_ID;
  const signingKey = process.env.WORLD_SIGNING_KEY;

  if (!rpId || !signingKey) {
    throw new Error("WORLD_RP_ID and WORLD_SIGNING_KEY must be set");
  }

  const rpSig: RpSignature = signRequest(action, signingKey);

  return {
    rp_id: rpId,
    nonce: rpSig.nonce,
    created_at: rpSig.createdAt,
    expires_at: rpSig.expiresAt,
    signature: rpSig.sig,
  };
}

// ── World ID Proof Verification ──────────────────────────────────
// Forwards proof to World's verification API

export async function verifyWorldIDProof(
  proof: Record<string, unknown>,
  rpId: string
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proof),
    }
  );
  return res.json() as Promise<Record<string, unknown>>;
}

// ── AgentBook Lookup ──────────────────────────────────
// Check if a wallet address is registered as human-backed

export async function checkAgentHuman(
  address: string,
  chainId = WORLD_CHAIN_ID
): Promise<string | null> {
  const v = getAgentBookVerifier();
  return v.lookupHuman(address.trim(), chainId);
}
