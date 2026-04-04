import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rpId = process.env.NEXT_PUBLIC_RP_ID;
  if (!rpId) {
    return res.status(500).json({ error: "RP_ID not configured" });
  }

  const { idkitResponse } = req.body;
  if (!idkitResponse) {
    return res.status(400).json({ error: "Missing idkitResponse" });
  }

  // Forward the IDKit v4 result payload as-is to the World ID cloud API
  const response = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(idkitResponse),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return res.status(400).json({
      error: errorData.detail ?? `Verification failed (${response.status})`,
    });
  }

  // Cloud verification passed. Return the v4 proof data so the frontend
  // can submit it on-chain to WorldIDVerifier.verify().
  const firstResponse = idkitResponse.responses?.[0];

  return res.status(200).json({
    success: true,
    // On-chain verification params (v4 format)
    onchain: firstResponse
      ? {
          nullifier: firstResponse.nullifier,
          proof: firstResponse.proof, // uint256[5]
          signal_hash: firstResponse.signal_hash,
          expires_at_min: firstResponse.expires_at_min,
          issuer_schema_id: firstResponse.issuer_schema_id,
          nonce: idkitResponse.nonce,
        }
      : null,
  });
}
