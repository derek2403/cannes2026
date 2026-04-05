# Register Agent (Full Flow)

Register a new DIVE oracle agent through the complete pipeline from `test-full-flow.sh`:
Phase 1 (Hedera account) -> Phase 2 (World ID) -> Phase 3 (0G Storage + iNFT mint + HCS) -> Phase 4 (inference test) -> Phase 5 (mirror node verify) -> Phase 6 (summary + links).

**World ID is NOT skipped.** The user must verify via World App unless they explicitly type "skip".

## Arguments

- `$ARGUMENTS` — Agent name (optional, defaults to `DIVEAgent-<timestamp>`)

## Instructions

The dev server must be running at http://localhost:3000. Confirm with user if unsure.

### Phase 1: Create Hedera Account

Run:
```bash
curl -s -X POST "http://localhost:3000/api/inft/prepare-agent" -H "Content-Type: application/json" -d '{}' --max-time 30
```

From the JSON response, save these values for later phases:
- `hederaAccountId` (e.g. `0.0.xxxxx`)
- `evmAddress` (e.g. `0x...`)
- `encryptedAgentKey`
- `agentBookNonce`

Print to user:
```
Phase 1: Hedera Account Created
  Account:  <hederaAccountId>
  EVM:      <evmAddress>
  Nonce:    <agentBookNonce>
```

If `hederaAccountId` is missing/empty, print the raw response and **stop**.

---

### Phase 2: World ID — AgentBook Registration

**Do NOT skip this phase automatically.** Ask the user:

```
Phase 2: World ID Verification

Your agent's EVM address: <evmAddress>

To register on AgentBook, open a SEPARATE terminal and run:

  npx @worldcoin/agentkit-cli register <evmAddress>

This will open a QR code — scan it with World App.

Type "done" when finished, or "skip" to continue without World ID.
```

Wait for user response.

**If user says "done":**
1. Sleep 3 seconds (for on-chain confirmation)
2. Check AgentBook:
```bash
curl -s -X POST "http://localhost:3000/api/world/check-agent" -H "Content-Type: application/json" -d '{"address": "<evmAddress>"}' --max-time 15
```
3. If response has `isHumanBacked: true` and a non-null `humanId`:
   - Save `humanId`, set `worldVerified = true`
   - Print: `World ID verified! humanId: <humanId>`
4. If not found:
   - Print: `Not found on AgentBook. Continuing without World ID.`
   - Set `humanId = null`, `worldVerified = false`

**If user says "skip":**
- Set `humanId = null`, `worldVerified = false`
- Print: `Skipping World ID.`

---

### Phase 3: Mint iNFT + HCS Logging

Determine agent name:
- If `$ARGUMENTS` is provided and non-empty, use that as the agent name
- Otherwise generate: `DIVEAgent-<unix_timestamp>`

Build the JSON body and send:
```bash
curl -s -X POST "http://localhost:3000/api/inft/register-agent" \
  -H "Content-Type: application/json" \
  --max-time 120 \
  -d '{
    "agentName": "<AGENT_NAME>",
    "domainTags": "oracle,research",
    "serviceOfferings": "evidence-analysis,voting",
    "modelProvider": "0g-compute",
    "systemPrompt": "You are <AGENT_NAME>, a DIVE oracle agent for prediction markets.",
    "reputation": 10,
    "hederaAccountId": "<HEDERA_ID>",
    "evmAddress": "<EVM_ADDR>",
    "encryptedAgentKey": "<ENC_KEY>",
    "humanId": "<HUMAN_ID_or_null>",
    "worldVerified": <true_or_false>
  }'
```

**Important:** `humanId` should be the string value or `null` (not the string `"null"`). `worldVerified` is a boolean.

This call takes 30-60 seconds. Tell the user it's in progress.

From the response, extract and save:
- `tokenId` (iNFT token number)
- `txHash` (mint transaction)
- `uploadTxHash` (0G Storage upload transaction)
- `rootHash` (0G Storage root hash)
- `hedera.profileTopicId`
- `hedera.registryTopicId`
- `hedera.reputationTopicId`
- `world.verified`
- `world.humanId`

Print:
```
Phase 3: Agent Registered
  iNFT Token:     #<tokenId>
  Mint TX:         <txHash>
  Upload TX:       <uploadTxHash>
  0G Root Hash:    <rootHash>
  Profile Topic:   <profileTopicId>
  Registry Topic:  <registryTopicId>
  Reputation Topic:<reputationTopicId>
  World Verified:  <true/false>
  Human ID:        <humanId or "none">
```

If `tokenId` is missing, print raw response and **stop**.

---

### Phase 4: Test Inference (0G Compute)

```bash
curl -s -X POST "http://localhost:3000/api/inft/infer" \
  -H "Content-Type: application/json" \
  --max-time 60 \
  -d '{"tokenId": <TOKEN_ID>, "message": "What is the capital of France? One sentence."}'
```

Print:
```
Phase 4: Inference Test
  Agent:    <agent>
  Source:   <source>
  Model:    <model>
  Provider: <provider>
  Response: <response>
```

---

### Phase 5: Verify HCS Messages (Mirror Node)

Wait 5 seconds for mirror node indexing.

**Profile Topic** (if profileTopicId exists):
```bash
curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/<PROFILE_TOPIC>/messages?limit=5&order=asc"
```
Each message in `.messages[]` has a `.message` field that is base64-encoded JSON. Decode with:
```bash
echo '<base64string>' | base64 -d
```
Print decoded profile info (display_name, worldVerified, humanId, inftTokenId).

**Registry Topic** (last 4 messages):
```bash
curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/<REGISTRY_TOPIC>/messages?limit=4&order=desc"
```
Decode and print the `op` and `agent_name` or `m` fields.

**Reputation Topic** (last 4 messages):
```bash
curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/<REP_TOPIC>/messages?limit=4&order=desc"
```
Decode and print the `op`, `tick`, `amt`, `to`, and `m` fields.

---

### Phase 6: Full Summary + Explorer Links

Print a complete summary:

```
============================================================
  DIVE AGENT REGISTERED
============================================================

  Agent Name:       <AGENT_NAME>
  iNFT Token ID:    #<tokenId>
  Compute Working:  <true/false based on Phase 4>

  --- Hedera ---
  Account ID:       <hederaAccountId>
  EVM Address:      <evmAddress>
  Profile Topic:    <profileTopicId>
  Registry Topic:   <registryTopicId>
  Reputation Topic: <reputationTopicId>

  --- 0G Chain ---
  Mint TX:          <txHash>
  Upload TX:        <uploadTxHash>
  Root Hash:        <rootHash>

  --- World ID ---
  Verified:         <true/false>
  Human ID:         <humanId or "none">

  --- Explorer Links ---
  0G Mint TX:       https://chainscan-galileo.0g.ai/tx/<txHash>
  0G Upload TX:     https://chainscan-galileo.0g.ai/tx/<uploadTxHash>
  Hedera Account:   https://hashscan.io/testnet/account/<hederaAccountId>
  Profile Topic:    https://hashscan.io/testnet/topic/<profileTopicId>
  Registry Topic:   https://hashscan.io/testnet/topic/<registryTopicId>
  Reputation Topic: https://hashscan.io/testnet/topic/<reputationTopicId>

  --- Mirror Node (raw JSON) ---
  Profile:          https://testnet.mirrornode.hedera.com/api/v1/topics/<profileTopicId>/messages?limit=5&order=asc
  Registry:         https://testnet.mirrornode.hedera.com/api/v1/topics/<registryTopicId>/messages?limit=5&order=desc
  Reputation:       https://testnet.mirrornode.hedera.com/api/v1/topics/<reputationTopicId>/messages?limit=5&order=desc
```

If World ID verified, also print:
```
  --- World Chain ---
  AgentBook:        https://worldscan.org/address/0xA23aB2712eA7BBa896930544C7d6636a96b944dA
  Agent Wallet:     https://worldscan.org/address/<evmAddress>
```

If Phase 4 succeeded, also print:
```
  --- 0G Compute ---
  Model:            <model>
  Provider:         https://chainscan-galileo.0g.ai/address/<provider>
```
