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

// Deploy DIVEAgents
console.log("\nDeploying DIVEAgents...");
const DIVEAgents = await ethers.getContractFactory("DIVEAgents");
const dive = await DIVEAgents.deploy(verifierAddr);
await dive.waitForDeployment();
const diveAddr = await dive.getAddress();
console.log("DIVEAgents deployed to:", diveAddr);

console.log("\n--- Copy these to ../lib/sparkinft-abi.ts ---");
console.log(`MOCK_VERIFIER_ADDRESS = "${verifierAddr}"`);
console.log(`SPARKINFT_ADDRESS     = "${diveAddr}"`);
