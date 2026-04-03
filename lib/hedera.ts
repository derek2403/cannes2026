import { Client } from "@hashgraph/sdk";

export function getClient(): Client {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      "Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY in environment variables"
    );
  }

  return Client.forTestnet().setOperator(operatorId, operatorKey);
}
