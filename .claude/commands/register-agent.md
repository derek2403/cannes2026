# Register Agent (Full Flow)

Register a new DIVE oracle agent through the complete pipeline:
Phase 1 (Hedera account) -> Phase 2 (World ID) -> Phase 3 (0G Storage + iNFT mint + HCS) -> Phase 4 (inference test) -> Phase 5 (mirror node verify) -> Phase 6 (summary + links).

## Arguments

- `$ARGUMENTS` — Optional. If provided, skip the interactive prompts and use this as the agent name with defaults for everything else.

## Instructions

### Step 0: Gather Inputs

**Read credentials from `.env`:**
Read the file `.env` in the project root. Extract:
- `OPENAI_API_KEY` — needed if user picks `openai` as model provider

**Ask the user for agent details (if `$ARGUMENTS` is empty):**

Ask all of these in a single message:

```
Let's register a new DIVE agent. I need a few details:

1. Agent name (e.g. "AlphaOracle", "MyResearchBot")
2. Domain tags — comma-separated (e.g. "oracle,research" or "oracle,data,markets")
3. Service offerings — comma-separated (e.g. "evidence-analysis,voting")
4. System prompt — what personality/role should this agent have?
5. Model provider — "0g-compute" (free, decentralized) or "openai" (uses your API key from .env)

Or just give me a name and I'll use sensible defaults for the rest.
```

**Defaults** (if user only gives a name or uses `$ARGUMENTS`):
- `domainTags`: `"oracle,research"`
- `serviceOfferings`: `"evidence-analysis,voting"`
- `systemPrompt`: `"You are <agentName>, a DIVE oracle agent for prediction markets."`
- `modelProvider`: `"0g-compute"`

If user picks `"openai"` as modelProvider, read `OPENAI_API_KEY` from `.env` and include it as `"apiKey"` in Step 3.

---

### Step 1: Create Hedera Account

```bash
curl -s -X POST "http://localhost:3000/api/inft/prepare-agent" -H "Content-Type: application/json" -d '{}' --max-time 30
```

Save from response: `hederaAccountId`, `evmAddress`, `encryptedAgentKey`.

Print:
```
Step 1: Hedera Account Created
  Account: <hederaAccountId>
  EVM:     <evmAddress>
```

If `hederaAccountId` is missing, print raw response and **stop**.

---

### Step 2: World ID Verification

**Do NOT skip this automatically.** First ask the user if they want to verify with World ID or skip.

**If they want to verify:**

Run the AgentKit CLI directly in the terminal (it will display a QR code the user scans with World App):

```bash
npx @worldcoin/agentkit-cli register <evmAddress>
```

Set timeout to 120 seconds — the user needs time to scan the QR code. The command blocks until verification completes or times out.

After the command finishes:
1. Wait 3 seconds for on-chain confirmation
2. Check AgentBook:
```bash
curl -s -X POST "http://localhost:3000/api/world/check-agent" -H "Content-Type: application/json" -d '{"address": "<evmAddress>"}' --max-time 15
```
3. If `isHumanBacked` is true: save `humanId`, set `worldVerified = true`
4. If not: warn user, set `humanId = null`, `worldVerified = false`

**If "skip":** set `humanId = null`, `worldVerified = false`

---

### Step 3: Register Agent (0G + iNFT + HCS)

Build the request body using all gathered inputs:

```bash
curl -s -X POST "http://localhost:3000/api/inft/register-agent" \
  -H "Content-Type: application/json" \
  --max-time 120 \
  -d '{
    "agentName": "<agentName>",
    "domainTags": "<domainTags>",
    "serviceOfferings": "<serviceOfferings>",
    "modelProvider": "<modelProvider>",
    "systemPrompt": "<systemPrompt>",
    "apiKey": "<OPENAI_API_KEY from .env, ONLY if modelProvider is openai, otherwise omit this field>",
    "reputation": 10,
    "hederaAccountId": "<from Step 1>",
    "evmAddress": "<from Step 1>",
    "encryptedAgentKey": "<from Step 1>",
    "humanId": "<from Step 2 or null>",
    "worldVerified": <true or false from Step 2>
  }'
```

**Important:**
- If `modelProvider` is `"0g-compute"`, do NOT include `apiKey` in the body.
- If `modelProvider` is `"openai"`, include `"apiKey"` with the value from `.env`.
- `humanId` should be the actual string or JSON `null` (not the string `"null"`).
- This call takes 30-60 seconds. Tell the user.

Save from response: `tokenId`, `txHash`, `uploadTxHash`, `rootHash`, `hedera.profileTopicId`, `hedera.registryTopicId`, `hedera.reputationTopicId`.

Print:
```
Step 3: Agent Registered!
  iNFT Token:      #<tokenId>
  Mint TX:          <txHash>
  Upload TX:        <uploadTxHash>
  0G Root Hash:     <rootHash>
  Profile Topic:    <profileTopicId>
  Registry Topic:   <registryTopicId>
  Reputation Topic: <reputationTopicId>
  World Verified:   <true/false>
  Human ID:         <humanId or "none">
```

If `tokenId` is missing, print raw response and **stop**.

---

### Step 4: Test Inference

```bash
curl -s -X POST "http://localhost:3000/api/inft/infer" \
  -H "Content-Type: application/json" \
  --max-time 60 \
  -d '{"tokenId": <tokenId>, "message": "What is the capital of France? One sentence."}'
```

Print:
```
Step 4: Inference Test
  Agent:    <agent>
  Source:   <source>
  Model:    <model>
  Provider: <provider>
  Response: <response>
```

---

### Step 5: Verify HCS (Mirror Node)

Wait 5 seconds, then fetch and decode base64 messages from each topic:

```bash
curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/<profileTopicId>/messages?limit=5&order=asc"
curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/<registryTopicId>/messages?limit=4&order=desc"
curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/<reputationTopicId>/messages?limit=4&order=desc"
```

Each `.messages[].message` is base64 JSON. Decode and print key fields.

---

### Step 6: Summary + Explorer Links

```
============================================================
  DIVE AGENT REGISTERED
============================================================

  Agent Name:       <agentName>
  iNFT Token ID:    #<tokenId>
  Model Provider:   <modelProvider>
  Domain:           <domainTags>
  Services:         <serviceOfferings>
  Compute Working:  <true/false>

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
```

If World ID verified:
```
  AgentBook:        https://worldscan.org/address/0xA23aB2712eA7BBa896930544C7d6636a96b944dA
  Agent Wallet:     https://worldscan.org/address/<evmAddress>
```
