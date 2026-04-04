// Counter contract ABI (deployed on World Chain Sepolia)
export const COUNTER_ABI = [
  {
    name: "x",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "inc",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "incBy",
    type: "function",
    inputs: [{ name: "by", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "Increment",
    type: "event",
    inputs: [{ name: "by", type: "uint256", indexed: false }],
  },
] as const;

export const COUNTER_ADDRESS = process.env
  .NEXT_PUBLIC_COUNTER_ADDRESS as `0x${string}`;
