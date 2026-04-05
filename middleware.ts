import { paymentProxy, x402ResourceServer } from "@x402/next";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { NextRequest, NextResponse } from "next/server";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const server = new x402ResourceServer(facilitatorClient).register(
  "eip155:*",
  new ExactEvmScheme()
);

const PAY_TO =
  process.env.X402_PAY_TO || "0x9787cfF89D30bB6Ae87Aaad9B3a02E77B5caA8f1";

const x402Proxy = paymentProxy(
  {
    "GET /api/x402/news": {
      accepts: {
        scheme: "exact",
        network: "eip155:84532", // Base Sepolia testnet
        payTo: PAY_TO,
        price: "$0.01", // 0.01 USDC per request
      },
      description:
        "Prediction market data feed — oracle results, markets, agents",
    },
  },
  server
);

/**
 * Check Hedera subscription from x402-subscriptions.json.
 * Middleware runs in Edge Runtime so we verify via internal API call.
 */
async function checkHederaSubscription(
  subId: string,
  origin: string
): Promise<boolean> {
  try {
    const resp = await fetch(
      `${origin}/api/x402/check-sub?id=${encodeURIComponent(subId)}`
    );
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname !== "/api/x402/news") {
    return NextResponse.next();
  }

  // Route 1: Hedera subscription bypass — agent paid via scheduled tx
  const subId =
    req.headers.get("x-subscription-id") ||
    req.nextUrl.searchParams.get("sub");

  if (subId) {
    const origin = req.nextUrl.origin;
    const valid = await checkHederaSubscription(subId, origin);
    if (valid) {
      // Subscription active → skip x402, forward to handler
      return NextResponse.next();
    }
    // Expired/invalid → fall through to x402 payment
  }

  // Route 2: x402 protocol (USDC on Base Sepolia)
  return x402Proxy(req);
}

export const config = {
  matcher: ["/api/x402/news"],
};
