/**
 * POST /api/commands/create-agent
 *
 * Curl-friendly agent creation. Runs the full flow:
 *   1. Upload config to 0G Storage
 *   2. Mint iNFT on 0G Chain (ERC-7857)
 *   3. Authorize wallet for inference
 *   4. Register on Hedera (HCS-11 profile + HCS-2 registry)
 *   5. Update hedera-state.json with both identities
 *
 * Example:
 *   curl -X POST http://localhost:3000/api/commands/create-agent \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "agentName": "ResearchBot",
 *       "modelProvider": "0g-compute",
 *       "systemPrompt": "You are a research agent...",
 *       "researchInstructions": "Focus on primary sources...",
 *       "domainTags": "oracle,research",
 *       "serviceOfferings": "evidence-analysis,voting",
 *       "apiKey": "",
 *       "reputation": 10
 *     }'
 */
export { default } from "../inft/register-agent";
