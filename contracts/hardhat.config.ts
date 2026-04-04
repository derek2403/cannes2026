import "dotenv/config";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import hardhatIgnitionEthersPlugin from "@nomicfoundation/hardhat-ignition-ethers";
import { defineConfig, configVariable } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatEthersPlugin, hardhatIgnitionEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 1 },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    zgTestnet: {
      type: "http",
      chainType: "l1",
      url: process.env.ZG_TESTNET_RPC_URL || "http://localhost:8545",
      accounts: process.env.ZG_TESTNET_PRIVATE_KEY
        ? [process.env.ZG_TESTNET_PRIVATE_KEY]
        : [],
    },
    worldChainSepolia: {
      type: "http",
      chainType: "op",
      chainId: 4801,
      url: configVariable("WORLD_CHAIN_SEPOLIA_RPC_URL"),
      accounts: [configVariable("WORLD_CHAIN_SEPOLIA_PRIVATE_KEY")],
    },
    worldChainMainnet: {
      type: "http",
      chainType: "op",
      chainId: 480,
      url: configVariable("WORLD_CHAIN_MAINNET_RPC_URL"),
      accounts: [configVariable("WORLD_CHAIN_MAINNET_PRIVATE_KEY")],
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      chainId: 11155111,
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
