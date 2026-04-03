import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ZeroGClawModule", (m) => {
  const verifier = m.contract("MockVerifier");
  const claw = m.contract("ZeroGClaw", [verifier]);

  return { verifier, claw };
});
