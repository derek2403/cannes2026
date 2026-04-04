export const PREDICTION_MARKET_ABI = [
  {
    name: "bet",
    type: "function",
    inputs: [
      { name: "marketId", type: "string" },
      { name: "yes", type: "bool" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "resolve",
    type: "function",
    inputs: [
      { name: "marketId", type: "string" },
      { name: "outcome", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "claim",
    type: "function",
    inputs: [{ name: "marketId", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "getPool",
    type: "function",
    inputs: [{ name: "marketId", type: "string" }],
    outputs: [
      { name: "yesPool", type: "uint256" },
      { name: "noPool", type: "uint256" },
      { name: "resolved", type: "bool" },
      { name: "outcome", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    name: "getPosition",
    type: "function",
    inputs: [
      { name: "marketId", type: "string" },
      { name: "bettor", type: "address" },
    ],
    outputs: [
      { name: "yesAmt", type: "uint256" },
      { name: "noAmt", type: "uint256" },
      { name: "hasClaimed", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    name: "BetPlaced",
    type: "event",
    inputs: [
      { name: "marketId", type: "string", indexed: false },
      { name: "bettor", type: "address", indexed: true },
      { name: "yes", type: "bool", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MarketResolved",
    type: "event",
    inputs: [
      { name: "marketId", type: "string", indexed: false },
      { name: "outcome", type: "uint8", indexed: false },
    ],
  },
  {
    name: "Claimed",
    type: "event",
    inputs: [
      { name: "marketId", type: "string", indexed: false },
      { name: "bettor", type: "address", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
    ],
  },
] as const;

export const Outcome = { UNRESOLVED: 0, YES: 1, NO: 2 } as const;

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;
