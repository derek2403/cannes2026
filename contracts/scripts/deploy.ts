import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "zgTestnet",
  chainType: "l1",
});

const [deployer] = await ethers.getSigners();
console.log("Deploying with account:", deployer.address);

// Deploy MockVerifier
console.log("\nDeploying MockVerifier...");
const MockVerifier = await ethers.getContractFactory("MockVerifier");
const verifier = await MockVerifier.deploy();
await verifier.waitForDeployment();
const verifierAddr = await verifier.getAddress();
console.log("MockVerifier deployed to:", verifierAddr);

// Deploy ZeroGClaw
console.log("\nDeploying ZeroGClaw...");
const ZeroGClaw = await ethers.getContractFactory("ZeroGClaw");
const claw = await ZeroGClaw.deploy(verifierAddr);
await claw.waitForDeployment();
const clawAddr = await claw.getAddress();
console.log("ZeroGClaw deployed to:", clawAddr);

console.log("\n--- Copy these to ../lib/sparkinft-abi.ts ---");
console.log(`MOCK_VERIFIER_ADDRESS = "${verifierAddr}"`);
console.log(`ZEROGCLAW_ADDRESS     = "${clawAddr}"`);
