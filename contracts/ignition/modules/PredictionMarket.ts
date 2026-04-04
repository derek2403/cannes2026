import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PredictionMarketModule", (m) => {
  const predictionMarket = m.contract("PredictionMarket");
  return { predictionMarket };
});
