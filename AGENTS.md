<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# World Agent Kit + World ID Integration

## What it does

Ensures every AI oracle agent is backed by a **unique verified human**. Prevents bot swarms and sybil attacks on oracle voting.

## Architecture

```
Human (World App)
  │
  ├── World ID 4.0 ──→ Zero-knowledge proof of humanness
  │                      No personal data shared, anonymous nullifier
  │
  └── AgentKit CLI ───→ Registers agent wallet on AgentBook (World Chain)
                         Maps wallet address → anonymous humanId
                         Same human always = same humanId
                         One human can register multiple wallets (platform enforces limits)
```

## How verification works (on-chain)

```
1. Human verifies via World App (scans QR or deep link)
2. CLI calls AgentBook contract on World Chain:
   - Contract: 0xA23aB2712eA7BBa896930544C7d6636a96b944dA
   - Writes: wallet → humanId mapping
3. Our backend calls lookupHuman(walletAddress):
   - Returns humanId (hex) if registered
   - Returns 0 if not registered
4. We use humanId to enforce 1-human-1-vote in oracle consensus
```

## Packages

- `@worldcoin/agentkit` — AgentBook verifier (`createAgentBookVerifier`, `lookupHuman`)
- `@worldcoin/idkit` — React widget for World ID verification (`IDKitRequestWidget`)
- `@worldcoin/idkit/signing` — Backend RP context signing (`signRequest`)
- `@worldcoin/agentkit-cli` — CLI to register wallets (run manually: `npx agentkit register <address>`)

## Files

| File | Purpose |
|------|---------|
| `lib/world-agentkit.ts` | AgentBook verifier (singleton), RP context generation, World ID proof verification, lookupHuman wrapper |
| `pages/api/world/rp-context.ts` | POST: generates signed RP context for IDKit widget |
| `pages/api/world/verify-human.ts` | POST: forwards World ID proof to World's `/api/v4/verify` endpoint |
| `pages/api/world/check-agent.ts` | POST: calls `lookupHuman(address)` on AgentBook, returns `{ isHumanBacked, humanId }` |
| `pages/api/world/protected-vote.ts` | POST: full verification flow — lookupHuman → check result → accept/reject with step-by-step events |
| `pages/world.tsx` | Demo UI: World ID widget, registration CLI instructions, AgentBook lookup, live verification demo |

## Env vars (in `.env.local`)

```
NEXT_PUBLIC_WORLD_APP_ID=app_ea2bdabc309eb5033b261032462658b2
WORLD_RP_ID=rp_34b39fc2351245db
WORLD_SIGNING_KEY=0x... (ECDSA private key, never expose client-side)
```

Get all 3 from https://developer.world.org → your app → Configuration tab.

## Key code patterns

### Backend: Check if agent is human-backed

```typescript
import { checkAgentHuman } from "@/lib/world-agentkit";

const humanId = await checkAgentHuman(walletAddress);
// humanId = "0x110ab..." if registered, null if not
```

### Backend: Generate RP context for IDKit

```typescript
import { generateRpContext } from "@/lib/world-agentkit";

const rpContext = generateRpContext("verify-oracle");
// Returns { rp_id, nonce, created_at, expires_at, signature }
```

### Frontend: IDKit widget

```tsx
import { IDKitRequestWidget, orbLegacy } from "@worldcoin/idkit";

<IDKitRequestWidget
  app_id="app_xxx"
  action="verify-oracle"
  rp_context={rpContext}
  preset={orbLegacy()}
  allow_legacy_proofs={true}
  open={open}
  onOpenChange={setOpen}
  handleVerify={verifyOnBackend}
  onSuccess={onSuccess}
/>
```

### CLI: Register agent wallet

```bash
npx agentkit register 0xWALLET_ADDRESS
# Opens World App for verification, registers on World Chain mainnet
# No testnet flag exists — mainnet only
```

## AgentBook contract details

| Network | Contract | Chain ID |
|---------|----------|----------|
| World Chain mainnet | `0xA23aB2712eA7BBa896930544C7d6636a96b944dA` | `eip155:480` |
| Base mainnet | `0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4` | `eip155:8453` |
| Base Sepolia (testnet) | `0xA23aB2712eA7BBa896930544C7d6636a96b944dA` | `eip155:84532` |

CLI only supports World Chain mainnet registration. No `--network` flag.

## Registered test agent

- Address: `0x5B638972D1362701f298e9F02F67f8f485c3c52e`
- Tx: `0x2261ba01bf7cf7dd9d8d3f0706a57f24f0b2bc2c87cc3d6a0cb90703b2f9d34c`
- HumanId: `0x110ab19b99d435fbca058a01eb76d14c96b7ba3c4f65325ac61e9d30bd73ccd`
- Network: World Chain mainnet

## How it ties into the prediction market

```
Oracle vote request comes in
  → checkAgentHuman(agentWallet)
  → if null: REJECT (not human-backed)
  → if humanId: CHECK if this humanId already voted
  → if already voted: REJECT (sybil / duplicate)
  → otherwise: ACCEPT vote into HCS-16 Flora
  → After resolution: HCS-20 mint/burn reputation tied to humanId
```

---

# Hedera HCS Standards Integration

## What it does

All oracle consensus, reputation, agent identity, and market registry run on Hedera Consensus Service (HCS). No Solidity — all via `@hashgraph/sdk` v2.81.0 with manual JSON messages on HCS topics.

## Architecture

```
Agent registers:
  → HCS-11 profile topic created (agent identity)
  → HCS-2 registry entry added (discoverable directory)
  → HCS-20 reputation topic deployed (point system)
  → HCS-16 Flora topics created (group oracle voting)

Market needs resolution:
  → Phase 1: agents commit sha256(vote|salt) to HCS-16 CTopic
  → Phase 1: agents reveal vote+salt (verified against commit hash)
  → Phase 2: agents discuss evidence on HCS-16 CTopic
  → Phase 3: final commit-reveal vote
  → HCS-20: mint/burn reputation based on correctness
  → HCS-2: market entry updated with result
```

## 4 HCS Standards

### HCS-20 — Auditable Points (Reputation)

On-chain reputation points. Deploy a ticker, then mint/burn/transfer.

**Topic memo:** `hcs-20`
**All numeric values are STRINGS** (max 18 chars per spec).

```json
// Deploy ticker
{"p":"hcs-20","op":"deploy","name":"Oracle Reputation","tick":"rep","max":"999999999","lim":"100"}

// Mint (correct oracle vote)
{"p":"hcs-20","op":"mint","tick":"rep","amt":"10","to":"0.0.xxxxx","m":"Correct vote"}

// Burn (wrong oracle vote)
{"p":"hcs-20","op":"burn","tick":"rep","amt":"5","from":"0.0.xxxxx","m":"Wrong vote"}

// Transfer
{"p":"hcs-20","op":"transfer","tick":"rep","amt":"5","from":"0.0.xxxxx","to":"0.0.yyyyy","m":"Reward"}
```

**Balance computation:** Replay all messages in order — deploy sets max/lim, mint adds, burn subtracts, transfer moves. See `computeHCS20Balances()`.

### HCS-2 — Topic Registries (Market + Agent Directory)

Indexed directory of topics. Register/update/delete entries. `uid` = sequence number of the original register message.

**Topic memo:** `hcs-2:0:300` (0=indexed, 300=TTL seconds)

```json
// Register entry
{"p":"hcs-2","op":"register","t_id":"0.0.xxxxx","m":"agent | OracleAlpha | 0.0.12345"}

// Update (uid = original sequence number)
{"p":"hcs-2","op":"update","uid":"3","t_id":"0.0.xxxxx","m":"Updated info"}

// Delete
{"p":"hcs-2","op":"delete","uid":"3","m":"Removed"}
```

**State computation:** Replay all messages — register creates, update modifies, delete marks deleted. See `computeHCS2State()`.

### HCS-11 — Profile Metadata (Agent Identity)

Agent profile stored as JSON. Includes linked HCS-20/HCS-16/HCS-2 topic IDs.

**Topic memo:** `hcs-11:profile:<accountId>`
**Profile type:** `1` = AI agent

```json
{
  "version": "1.0",
  "type": 1,
  "display_name": "Oracle Agent Alpha",
  "uaid": "uaid:did:hedera:testnet:0.0.xxxxx",
  "bio": "Prediction market oracle",
  "aiAgent": {
    "type": 1,
    "capabilities": [2, 11, 16, 20],
    "model": "oracle-v1",
    "creator": "Cannes2026"
  },
  "properties": {
    "hederaAccountId": "0.0.xxxxx",
    "reputationTopicId": "0.0.yyyyy",
    "registryTopicId": "0.0.zzzzz",
    "floraTopics": {
      "communication": "0.0.aaa",
      "transaction": "0.0.bbb",
      "state": "0.0.ccc"
    }
  }
}
```

**AgentProfileLinks interface:**

```typescript
interface AgentProfileLinks {
  reputationTopicId?: string;   // HCS-20 points topic
  registryTopicId?: string;     // HCS-2 registry
  floraTopicIds?: {              // HCS-16 Flora topics
    communication?: string;
    transaction?: string;
    state?: string;
  };
}
```

### HCS-16 — Flora Coordination (Group Oracle Voting)

Multi-agent coordination with 3 topics per Flora group. Our custom extensions add commit-reveal blind voting on top of the standard.

**Topic memos:**
- Communication: `hcs-16:<floraId>:0`
- Transaction: `hcs-16:<floraId>:1`
- State: `hcs-16:<floraId>:2`

**Standard ops** (from HCS-16 spec):

```json
// Flora created
{"p":"hcs-16","op":"flora_created","flora_account_id":"0.0.xxx","topics":{"communication":"0.0.aaa","transaction":"0.0.bbb","state":"0.0.ccc"}}

// Group message
{"p":"hcs-16","op":"message","operator_id":"0.0.sender@0.0.flora","data":"Evidence text","timestamp":"..."}

// Join vote
{"p":"hcs-16","op":"flora_join_vote","account_id":"0.0.candidate","approve":true,"operator_id":"0.0.voter@0.0.flora"}

// State update
{"p":"hcs-16","op":"state_update","operator_id":"0.0.op@0.0.flora","hash":"...","epoch":1,"timestamp":"..."}
```

**Custom extensions for prediction market voting:**

```json
// Phase 1/3: Commit (blind vote)
{"p":"hcs-16","op":"commit","operator_id":"0.0.agent@0.0.flora","phase":1,"hash":"sha256(YES|randomsalt)","market_id":"market-1","timestamp":"..."}

// Phase 1/3: Reveal (after commit deadline)
{"p":"hcs-16","op":"reveal","operator_id":"0.0.agent@0.0.flora","phase":1,"vote":"YES","salt":"abc123...","market_id":"market-1","timestamp":"..."}

// Phase 2: Discussion (evidence sharing between votes)
{"p":"hcs-16","op":"discussion","operator_id":"0.0.agent@0.0.flora","market_id":"market-1","data":"Reuters confirms event","evidence_url":"https://...","timestamp":"..."}
```

**Commit-reveal flow:**
1. Agent generates salt: `randomBytes(16).toString("hex")`
2. Agent computes hash: `sha256(vote|salt)` where vote is YES/NO/UNSURE/NOT_ENOUGH_DATA
3. Agent submits commit (hash only) before commit deadline
4. After commit deadline, agent reveals vote + salt
5. Backend verifies: `sha256(revealedVote|revealedSalt) === commitHash`
6. Consensus: ≥70% of verified votes agree → result accepted

**Time windows** (enforced via Hedera consensus_timestamp):
- Commit before commitDeadline → valid
- Reveal before commitDeadline → REJECTED (early reveal)
- Reveal between deadlines → valid
- Reveal after revealDeadline → REJECTED (too late = DIDNT_VOTE)
- Never committed → DIDNT_VOTE (penalized)

**Vote options:** `YES | NO | UNSURE | NOT_ENOUGH_DATA`
- `DIDNT_VOTE` = agent never submitted (computed during tally, penalized via HCS-20 burn)

## Shared Library

`lib/hcs-standards.ts` — all message builders + mirror node reader + tally logic.

**Exported functions:**

| Function | Standard | What it does |
|----------|----------|-------------|
| `readTopicMessages(topicId, limit?)` | All | Fetch + decode base64 messages from mirror node |
| `createTopic(client, memo, submitKey?)` | All | Create HCS topic with optional submit key |
| `submitMessage(client, topicId, message)` | All | Submit JSON message to topic |
| `getOperatorKey()` | All | Get operator PrivateKey from env |
| `buildHCS20Deploy(name, tick, max, lim)` | HCS-20 | Deploy reputation ticker |
| `buildHCS20Mint(tick, amt, to, memo?)` | HCS-20 | Mint points |
| `buildHCS20Burn(tick, amt, from, memo?)` | HCS-20 | Burn points |
| `buildHCS20Transfer(tick, amt, from, to, memo?)` | HCS-20 | Transfer points |
| `computeHCS20Balances(messages)` | HCS-20 | Replay messages → compute balances |
| `buildHCS2Register(topicId, memo?)` | HCS-2 | Register entry in directory |
| `buildHCS2Update(uid, topicId, memo?)` | HCS-2 | Update entry (uid = seq number) |
| `buildHCS2Delete(uid, memo?)` | HCS-2 | Delete entry |
| `computeHCS2State(messages)` | HCS-2 | Replay messages → current directory state |
| `buildHCS11Profile(name, accountId, capabilities, model, bio?, links?)` | HCS-11 | Build agent profile JSON |
| `buildHCS16FloraCreated(floraAccountId, cTopic, tTopic, sTopic)` | HCS-16 | Flora initialization message |
| `buildHCS16Message(senderId, floraAccountId, content)` | HCS-16 | Group chat message |
| `buildHCS16Vote(voterId, floraAccountId, candidateId, approve)` | HCS-16 | Join vote |
| `buildHCS16StateUpdate(operatorId, floraAccountId, hash, epoch)` | HCS-16 | State commit |
| `buildHCS16Commit(operatorId, floraAccountId, phase, hash, marketId)` | HCS-16 | Blind vote commit |
| `buildHCS16Reveal(operatorId, floraAccountId, phase, vote, salt, marketId)` | HCS-16 | Vote reveal |
| `buildHCS16Discussion(operatorId, floraAccountId, marketId, content, url?)` | HCS-16 | Evidence discussion |
| `generateSalt()` | HCS-16 | Random 16-byte hex salt |
| `hashVote(vote, salt)` | HCS-16 | sha256(vote\|salt) |
| `verifyVote(vote, salt, commitHash)` | HCS-16 | Verify reveal matches commit |
| `computeVoteTally(messages, marketId, members, deadlines?)` | HCS-16 | Full tally with time window enforcement |

## API Routes

| Route | Standard | Method | Actions / Body |
|-------|----------|--------|----------------|
| `pages/api/hcs/hcs20.ts` | HCS-20 | POST | `action`: deploy, mint, burn, transfer, balance |
| `pages/api/hcs/hcs2.ts` | HCS-2 | POST | `action`: create, register, update, delete, read |
| `pages/api/hcs/hcs11.ts` | HCS-11 | POST | `action`: create, read |
| `pages/api/hcs/hcs16.ts` | HCS-16 | POST | `action`: create, commit, reveal, discussion, tally, message, vote, state, read |
| `pages/api/hcs/register-agent.ts` | All | POST | Full agent registration: creates HCS-11 profile, registers in HCS-2, links HCS-20 + HCS-16 topics |
| `pages/api/hcs/discover-agents.ts` | HCS-2+11 | POST | Read registry → fetch each agent's HCS-11 profile |

### Hedera SDK Routes (non-HCS)

| Route | What it does |
|-------|-------------|
| `pages/api/hedera/create-account.ts` | Create new Hedera testnet account with initial HBAR balance |
| `pages/api/hedera/create-token.ts` | Create HTS token (YES/NO outcome tokens) |
| `pages/api/hedera/create-topic.ts` | Create HCS topic with memo and optional submit key |
| `pages/api/hedera/submit-message.ts` | Submit message to any HCS topic |
| `pages/api/hedera/schedule-transaction.ts` | Create scheduled transaction (deadline triggers) |

## Env vars (in `.env.local`)

```
HEDERA_OPERATOR_ID=0.0.7946371
HEDERA_OPERATOR_KEY=<DER-encoded private key>
HEDERA_PRIVATE_KEY=<hex private key>
```

## Mirror Node

All reads go through the testnet mirror node:

```
https://testnet.mirrornode.hedera.com/api/v1/topics/{topicId}/messages?limit=100&order=asc
```

Messages are base64-encoded JSON. Decoded via `Buffer.from(msg.message, "base64").toString("utf-8")`.

## State File

`hedera-state.json` — persistent state auto-updated by `register-agent.ts`. Other Claude sessions can read this to know all agent/topic details.

```json
{
  "network": "testnet",
  "operatorId": "0.0.7946371",
  "registryTopicId": null,
  "reputationTopicId": null,
  "agents": [],
  "floras": [],
  "hcsStandards": {
    "HCS-2": "Topic Registry — combined market + agent directory",
    "HCS-11": "Agent Identity — profile with linked reputation/flora/registry",
    "HCS-16": "Flora Coordination — 3-phase commit-reveal blind voting",
    "HCS-20": "Auditable Points — reputation deploy/mint/burn/transfer"
  },
  "topicMemoFormats": {
    "HCS-2": "hcs-2:0:300",
    "HCS-11": "hcs-11:profile:<accountId>",
    "HCS-16-communication": "hcs-16:<floraId>:0",
    "HCS-16-transaction": "hcs-16:<floraId>:1",
    "HCS-16-state": "hcs-16:<floraId>:2",
    "HCS-20": "hcs-20"
  }
}
```

## Topic Creation Details

| Standard | Topic Memo | Submit Key |
|----------|-----------|------------|
| HCS-20 | `hcs-20` | Operator key (controlled minting) |
| HCS-2 | `hcs-2:0:300` | Operator key (controlled registry) |
| HCS-11 | `hcs-11:profile:{accountId}` | Operator key (owner updates) |
| HCS-16 CTopic | `hcs-16:{floraId}:0` | Operator key |
| HCS-16 TTopic | `hcs-16:{floraId}:1` | Operator key |
| HCS-16 STopic | `hcs-16:{floraId}:2` | Operator key |

## Test UI

`pages/hedera.tsx` — 8-section test page for all Hedera operations:
1. Create Account
2. Create Token (HTS)
3. Create Topic
4. Submit Message
5. Schedule Transaction
6. HCS-20 Reputation Points
7. HCS-2 Registry
8. HCS-11 Agent Profile + HCS-16 Flora

---

# 0G Network Integration (INFT + Compute + Storage)

## Chain Config

- **Network:** 0G-Galileo-Testnet
- **Chain ID:** 16602
- **RPC:** `https://evmrpc-testnet.0g.ai`
- **Explorer:** `https://chainscan-galileo.0g.ai`
- **Native Token:** 0G (18 decimals)
- **Wagmi Config:** `lib/wagmi.ts` — injected connector, SSR enabled

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                       UI LAYER                           │
├──────────────────┬───────────────────┬───────────────────┤
│  pages/inft.tsx  │ pages/compute.tsx │ pages/storage.tsx │
│  (Agent Mgmt)    │ (GPU Marketplace) │ (File Storage)    │
└──────┬───────────┴────────┬──────────┴────────┬──────────┘
       │                    │                   │
┌──────v────────────────────v───────────────────v──────────┐
│                   API LAYER (pages/api/)                  │
│  /inft/*           /compute/*           /storage/*        │
│  upload-config     list-services        upload            │
│  infer             setup-account        download          │
│  chat-fallback     inference            kv-write          │
│                    ft-create-task                         │
│                    ft-get-task                            │
│                    ft-list-services                       │
│                    ft-list-models                         │
└──────┬────────────────────┬───────────────────┬──────────┘
       │                    │                   │
┌──────v──────────┐  ┌──────v───────────┐ ┌─────v──────────┐
│  0G Chain       │  │  0G Compute      │ │  0G Storage    │
│  ZeroGClaw      │  │  GPU inference   │ │  Content-      │
│  ERC-7857 iNFT  │  │  Fine-tuning     │ │  addressed     │
│  Contract       │  │  Ledger system   │ │  Merkle trees  │
└─────────────────┘  └──────────────────┘ └────────────────┘
```

## Env vars (in `.env.local`)

```
ZG_STORAGE_PRIVATE_KEY=<hex private key>
```

Used for: signing 0G Storage uploads, creating ethers Wallet for Compute broker, deriving AES-256 encryption key (SHA-256 hash of key).

---

## 1. INFT — Intelligent NFT (ERC-7857)

### What it does

ERC-7857 agent NFTs with on-chain profiles, cron scheduling, delegated authorization, and LLM inference via 0G Compute. Each iNFT stores its agent config on 0G Storage and uses decentralized GPU inference.

### Contract

- **Name:** ZeroGClaw (symbol: 0GCLAW)
- **Address:** `0x82cBeaD6D47468d6e8Ff6C3f49A25DD06C619507`
- **Network:** 0G Galileo Testnet (16602)
- **Source:** `contracts/contracts/0g/ZeroGClaw.sol`
- **ABI:** `lib/sparkinft-abi.ts` — exports `SPARKINFT_ABI` and `SPARKINFT_ADDRESS`

### Contract Functions

| Function | What it does |
|----------|-------------|
| `mintAgent(to, botId, domainTags, serviceOfferings, iDatas)` | Mint agent NFT with ERC-7857 IntelligentData |
| `ownerOf(tokenId)` | Returns token owner address |
| `authorizeUsage(tokenId, user)` | Delegate agent usage to another wallet |
| `isAuthorized(tokenId, user)` | Check if user can use the agent |
| `revokeAuthorization(tokenId, user)` | Revoke delegated access |
| `setCronConfig(tokenId, schedule, prompt)` | Set cron schedule + prompt |
| `toggleCron(tokenId, enabled)` | Enable/disable cron |
| `recordExecution(tokenId)` | Record cron execution (increments count) |
| `setX402Wallet(tokenId, wallet)` | Set x402 payment wallet |
| `setX402Endpoints(tokenId, endpoints[])` | Set x402 endpoint URLs |
| `getAgentProfile(tokenId)` | Returns full AgentProfile struct |
| `getIntelligentDatas(tokenId)` | Returns IntelligentData[] (dataDescription, dataHash) |

### IntelligentData (ERC-7857)

Each iNFT stores `IntelligentData[]`:
- `dataDescription`: URI pointer, e.g. `0g://storage/0x<rootHash>`
- `dataHash`: keccak256 of the agent config JSON

The config stored on 0G Storage contains: botId, domainTags, serviceOfferings, systemPrompt, modelProvider, optional encrypted apiKey.

### Files

| File | Purpose |
|------|---------|
| `pages/inft.tsx` | UI: mint agents, view profiles, chat, cron config, live executor |
| `pages/api/inft/upload-config.ts` | Upload agent config to 0G Storage, returns rootHash + dataHash |
| `pages/api/inft/infer.ts` | LLM inference: auth check → fetch config from storage → route to 0G Compute or API |
| `pages/api/inft/chat-fallback.ts` | Fallback inference using OpenAI-compatible endpoint |
| `lib/sparkinft-abi.ts` | Contract ABI + address constant |
| `contracts/contracts/0g/ZeroGClaw.sol` | Solidity source |
| `contracts/contracts/0g/interfaces/IERC7857.sol` | ERC-7857 interface |
| `contracts/contracts/0g/interfaces/IERC7857Authorize.sol` | Authorization extension |
| `contracts/contracts/0g/interfaces/IERC7857Metadata.sol` | Metadata extension |
| `contracts/contracts/0g/interfaces/IERC7857DataVerifier.sol` | Data verification extension |

### API: Upload Config

**POST** `/api/inft/upload-config`

```json
// Request
{
  "botId": "agent-001",
  "domainTags": "defi,analytics",
  "serviceOfferings": "scraping,analysis",
  "systemPrompt": "You are a helpful AI...",
  "modelProvider": "0g-compute",
  "apiKey": "sk-..." // optional — encrypted with AES-256-GCM if provided
}

// Response
{
  "success": true,
  "dataDescription": "0g://storage/0x...",
  "dataHash": "0x...",
  "rootHash": "0x...",
  "txHash": "0x..."
}
```

### API: Infer (Chat with Agent)

**POST** `/api/inft/infer`

```json
// Request
{ "tokenId": 4, "message": "Hello", "userAddress": "0x...", "maxTokens": 500 }

// Response
{
  "success": true,
  "tokenId": 4,
  "agent": "agent-001",
  "response": "Hello! How can I help?",
  "source": "0g-compute",
  "model": "qwen/qwen-2.5-7b-instruct",
  "provider": "0x...",
  "configOnStorage": true
}
```

**Inference flow:**
1. Check `ownerOf(tokenId)` or `isAuthorized(tokenId, userAddress)` — 403 if neither
2. Fetch `IntelligentData` from contract
3. Download agent config from 0G Storage (if `dataDescription` starts with `0g://storage/`)
4. Route inference:
   - `modelProvider = "0g-compute"` → `callVia0GCompute()` (decentralized GPU, no API key)
   - `modelProvider = "openai|groq|deepseek"` → decrypt stored API key, call OpenAI-compatible endpoint
5. Fallback: use 0G Compute if no config found

### Key code pattern: 0G Compute inference

```typescript
import { callVia0GCompute } from "@/lib/0g-compute";

const result = await callVia0GCompute(systemPrompt, message, maxTokens);
// result.reply = "..."
// result.model = "qwen/qwen-2.5-7b-instruct"
// result.provider = "0x..."
```

---

## 2. 0G Compute Network

### What it does

Decentralized GPU marketplace. Users create a **ledger** (on-chain account), deposit A0GI tokens, transfer balance to **provider sub-accounts**, then call inference or fine-tuning endpoints. Responses are verified via TEE signatures.

### Key Concepts

- **Ledger:** User's on-chain balance on 0G Compute (holds A0GI)
- **Provider:** GPU operator running inference/fine-tuning services
- **Sub-account:** Balance allocated to a specific provider + service type
- **1 A0GI = 10^18 neuron** (smallest unit for transfers)
- **TEE verification:** Trusted Execution Environment signatures verify response authenticity

### Known Providers (testnet)

| Address | Model |
|---------|-------|
| `0xa48f01287233509FD694a22Bf840225062E67836` | qwen/qwen-2.5-7b-instruct |
| `0x8e60d466FD16798Bec4868aa4CE38586D5590049` | openai/gpt-oss-20b |
| `0x69Eb5a0BD7d0f4bF39eD5CE9Bd3376c61863aE08` | google/gemma-3-27b-it |

### Files

| File | Purpose |
|------|---------|
| `pages/compute.tsx` | UI: discover services, account setup, inference, fine-tuning |
| `pages/api/compute/list-services.ts` | List all inference providers (model, pricing, verifiability) |
| `pages/api/compute/setup-account.ts` | Create ledger, deposit, transfer to sub-account, get balance |
| `pages/api/compute/inference.ts` | Send message to provider, get verified response |
| `pages/api/compute/ft-list-services.ts` | List fine-tuning providers |
| `pages/api/compute/ft-list-models.ts` | List available fine-tuning models |
| `pages/api/compute/ft-create-task.ts` | Create fine-tuning task with dataset + training params |
| `pages/api/compute/ft-get-task.ts` | Get task status, list tasks, get training logs |
| `lib/0g-compute.ts` | Broker setup: `createZGComputeNetworkBroker()` + `callVia0GCompute()` helper |

### Library: `lib/0g-compute.ts`

```typescript
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

// Creates broker with wallet derived from ZG_STORAGE_PRIVATE_KEY
// RPC: https://evmrpc-testnet.0g.ai

export async function callVia0GCompute(
  systemPrompt: string,
  message: string,
  maxTokens: number
): Promise<{ reply: string; model: string; provider: string }>
```

### API: Setup Account

**POST** `/api/compute/setup-account`

```json
// Create ledger (min ~5 A0GI to succeed)
{ "action": "create-ledger", "amount": "5" }

// Deposit more funds
{ "action": "deposit", "amount": "1" }

// Transfer to provider sub-account
{ "action": "transfer", "amount": "0.1", "provider": "0x...", "service": "inference" }

// Check balance
{ "action": "get-balance" }
```

### API: Inference

**POST** `/api/compute/inference`

```json
// Request
{ "provider": "0x...", "message": "Classify this text..." }

// Response
{
  "success": true,
  "provider": "0x...",
  "model": "qwen/qwen-2.5-7b-instruct",
  "response": "Positive. The text...",
  "verified": true,
  "usage": { "prompt_tokens": 10, "completion_tokens": 20 }
}
```

**Flow:** Acknowledge provider signer → fetch service metadata → get auth headers → POST to `{endpoint}/chat/completions` (OpenAI-compatible) → verify response → settle fee.

### API: Fine-Tuning

**POST** `/api/compute/ft-create-task`

```json
{
  "provider": "0x...",
  "model": "Qwen2.5-0.5B-Instruct",
  "dataset": [
    { "instruction": "Classify...", "input": "How do I...?", "output": "Category: SDK Bug..." }
  ],
  "trainingParams": { "num_train_epochs": 1, "learning_rate": 0.0002 }
}
```

Note: Dataset upload uses manual TEE HTTP request (bypasses broken SDK FormData). Signs timestamp message for authentication.

**POST** `/api/compute/ft-get-task`

```json
{ "provider": "0x...", "taskId": "task-123", "action": "status" }  // or "list" or "log"
```

---

## 3. 0G Storage Network

### What it does

Content-addressed, immutable file storage with Merkle tree verification. Supports optional AES-256-GCM encryption. Used by INFT to store agent configs.

### Network

- **Indexer:** `https://indexer-storage-testnet-turbo.0g.ai`
- **RPC:** `https://evmrpc-testnet.0g.ai`

### Files

| File | Purpose |
|------|---------|
| `pages/storage.tsx` | UI: upload/download content, KV store |
| `pages/api/storage/upload.ts` | Upload content to 0G Storage (optional encryption) |
| `pages/api/storage/download.ts` | Download by root hash (optional decryption + Merkle verification) |
| `pages/api/storage/kv-write.ts` | Store key-value pairs on 0G Storage |
| `lib/encrypt.ts` | AES-256-GCM encrypt/decrypt using SHA-256(ZG_STORAGE_PRIVATE_KEY) |

### API: Upload

**POST** `/api/storage/upload`

```json
// Request
{ "content": "Knowledge content here...", "encrypted": false }

// Response
{
  "success": true,
  "rootHash": "0x...",
  "txHash": "0x...",
  "encrypted": false,
  "contentLength": 142
}
```

**Flow:** Optionally encrypt → write temp file → create ZgFile + Merkle tree → upload to indexer → return root hash → cleanup.

### API: Download

**POST** `/api/storage/download`

```json
// Request
{ "rootHash": "0x...", "decrypt": true }

// Response
{
  "success": true,
  "rootHash": "0x...",
  "content": "Knowledge content here...",
  "verified": true,
  "decrypted": true
}
```

### API: KV Write

**POST** `/api/storage/kv-write`

```json
// Request
{ "key": "0g-storage:merkle-verification", "value": "Use SDK v0.48+..." }

// Response
{ "success": true, "key": "...", "rootHash": "0x...", "txHash": "0x..." }
```

Encodes as JSON with `{ sparkKey, sparkValue, timestamp, type: "knowledge-item" }`, uploads to 0G Storage.

### Encryption: `lib/encrypt.ts`

```typescript
export function encrypt(plaintext: string): string
// Key: SHA-256(ZG_STORAGE_PRIVATE_KEY)
// Returns: base64(IV[16] + authTag[16] + ciphertext)

export function decrypt(encryptedBase64: string): string
// Extracts IV + tag + ciphertext, decrypts with AES-256-GCM
```

Used for: agent API key encryption in upload-config, content encryption in storage upload/download, decryption in infer before calling external LLM.

---

## Integration Points

- **INFT → Storage:** Agent config uploaded to 0G Storage on mint. Root hash stored in ERC-7857 `IntelligentData`.
- **INFT → Compute:** Inference routed through 0G Compute (decentralized GPU). No API key needed.
- **Compute → Storage:** Fine-tuning datasets uploaded to TEE via manual HTTP.
- **Storage → Chain:** Root hashes referenced in on-chain IntelligentData — content-addressed integrity.

## Wallet Connection

- **Provider:** RainbowKit + Wagmi (Pages Router with `ssr: false` dynamic import)
- **Components:** `components/Providers.tsx` wraps WagmiProvider + QueryClientProvider + RainbowKitProvider
- **App:** `pages/_app.tsx` dynamically imports Providers with `ssr: false` to avoid SSR errors
- **Auto-connect:** Enabled via `injected()` connector
