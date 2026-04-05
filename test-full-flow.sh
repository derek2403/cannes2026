#!/bin/bash
# ═══════════════════���══════════════════════���════════════════════
# DIVE Agents — Full Registration Flow + World ID
# ════════��════════════════════��═════════════════════════════════
# Phase 1: Create Hedera account (prepare-agent)
# Phase 2: Register on AgentBook via World ID (CLI)
# Phase 3: Mint iNFT + HCS logging (register-agent) with humanId
# Phase 4: Test inference (0G Compute)
# Phase 5: Verify all HCS messages on mirror node
# Phase 6: Print all hashes + explorer links
# ═════════════════════════════���═════════════════════════════════

BASE="http://localhost:3000"
AGENT_NAME="DIVEAgent-$(date +%s)"
TMP="${TMPDIR:-/tmp}/dive-test-$$.json"
TMP2="${TMPDIR:-/tmp}/dive-test2-$$.json"

# Helper: parse JSON field from temp file
jval() {
  node -e "const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8')); process.stdout.write(String(d$1||''))"
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  DIVE AGENTS — FULL REGISTRATION + WORLD ID"
echo "  Agent: $AGENT_NAME"
echo "════════════��══════════════════════════════════════"
echo ""

# ── PHASE 1: Create Hedera account ──────────────────────
echo "▶ PHASE 1: Creating Hedera account..."
curl -s -X POST "$BASE/api/inft/prepare-agent" \
  -H "Content-Type: application/json" \
  -d "{}" -o "$TMP" --max-time 30

node -e "
  const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8'));
  console.log('  Hedera Account: ', d.hederaAccountId);
  console.log('  EVM Address:    ', d.evmAddress);
  console.log('  AgentBook Nonce:', d.agentBookNonce);
"

HEDERA_ID=$(jval ".hederaAccountId")
EVM_ADDR=$(jval ".evmAddress")
ENC_KEY=$(jval ".encryptedAgentKey")

if [ -z "$HEDERA_ID" ]; then
  echo "  ✗ Phase 1 failed!"
  cat "$TMP"
  exit 1
fi
echo "  ✓ Phase 1 done"
echo ""

# ── PHASE 2: World ID — Register on AgentBook ──────────
echo "═════════════════════════════════════════════���═════"
echo "▶ PHASE 2: World ID — AgentBook Registration"
echo "═══════════════════════════════════════════��═══════"
echo ""
echo "  Your agent's EVM address: $EVM_ADDR"
echo ""
echo "  Press ENTER to launch AgentKit CLI (or type 'skip')..."
read -r WORLD_CHOICE

HUMAN_ID=""
WORLD_VERIFIED="false"

if [ "$WORLD_CHOICE" != "skip" ]; then
  echo ""
  echo "  Launching AgentKit CLI — scan QR with World App..."
  echo "  ─────────────────────────────────────────────────"
  echo ""

  npx @worldcoin/agentkit-cli register "$EVM_ADDR"
  AGENTKIT_EXIT=$?

  echo ""
  if [ $AGENTKIT_EXIT -eq 0 ]; then
    echo "  ✓ AgentKit CLI completed."
  else
    echo "  ⚠ AgentKit CLI exited with code $AGENTKIT_EXIT."
  fi

  sleep 3
  echo "  Checking AgentBook for humanId..."

  curl -s -X POST "$BASE/api/world/check-agent" \
    -H "Content-Type: application/json" \
    -d "{\"address\": \"$EVM_ADDR\"}" -o "$TMP" --max-time 15

  node -e "
    const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8'));
    console.log('    isHumanBacked:', d.isHumanBacked);
    console.log('    humanId:      ', d.humanId);
  "

  HUMAN_ID=$(jval ".humanId")

  if [ -n "$HUMAN_ID" ] && [ "$HUMAN_ID" != "null" ]; then
    WORLD_VERIFIED="true"
    echo "  ✓ World ID verified!"
  else
    echo "  ✗ Not found on AgentBook. Continuing without World ID..."
    HUMAN_ID=""
    WORLD_VERIFIED="false"
  fi
else
  echo "  Skipping World ID."
fi
echo ""

# ── PHASE 3: Mint iNFT + HCS logging ───────────────────
echo "═══════════════════════════════��═══════════════════"
echo "▶ PHASE 3: Register Agent (0G + iNFT + HCS)"
echo "══════════════════���════════════════════════════════"
echo ""

node -e "
  const body = {
    agentName: '$AGENT_NAME',
    domainTags: 'oracle,research',
    serviceOfferings: 'evidence-analysis,voting',
    modelProvider: '0g-compute',
    systemPrompt: 'You are $AGENT_NAME, a DIVE oracle agent for prediction markets.',
    reputation: 10,
    hederaAccountId: '$HEDERA_ID',
    evmAddress: '$EVM_ADDR',
    encryptedAgentKey: '$ENC_KEY',
    humanId: '$HUMAN_ID' || null,
    worldVerified: $WORLD_VERIFIED
  };
  require('fs').writeFileSync('$TMP', JSON.stringify(body));
"

echo "  Uploading to 0G Storage + Minting iNFT + HCS logging..."
echo "  (this takes ~30-60 seconds)"
echo ""

curl -s -X POST "$BASE/api/inft/register-agent" \
  -H "Content-Type: application/json" \
  -d @"$TMP" -o "$TMP2" --max-time 120

cp "$TMP2" "$TMP"

node -e "
  const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8'));
  console.log('  iNFT Token ID:    ', d.tokenId);
  console.log('  Mint TX:          ', d.txHash);
  console.log('  Upload TX:        ', d.uploadTxHash);
  console.log('  0G Root Hash:     ', d.rootHash);
  console.log('  Hedera Account:   ', d.hedera?.accountId);
  console.log('  Profile Topic:    ', d.hedera?.profileTopicId);
  console.log('  Registry Topic:   ', d.hedera?.registryTopicId);
  console.log('  Reputation Topic: ', d.hedera?.reputationTopicId);
  console.log('  World Verified:   ', d.world?.verified);
  console.log('  Human ID:         ', d.world?.humanId);
"

TOKEN_ID=$(jval ".tokenId")
PROFILE_TOPIC=$(jval ".hedera?.profileTopicId")
REGISTRY_TOPIC=$(jval ".hedera?.registryTopicId")
REP_TOPIC=$(jval ".hedera?.reputationTopicId")
ROOT_HASH=$(jval ".rootHash")
MINT_TX=$(jval ".txHash")
UPLOAD_TX=$(jval ".uploadTxHash")

if [ -z "$TOKEN_ID" ]; then
  echo "  �� Phase 3 failed!"
  cat "$TMP"
  exit 1
fi
echo "  ✓ Phase 3 done"
echo ""

# ── PHASE 4: Test inference ──��──────────────────────────
echo "══════��════════════════════════���═══════════════════"
echo "▶ PHASE 4: Test Inference (0G Compute)"
echo "═══════════════════════════════════════════════════"
echo ""

curl -s -X POST "$BASE/api/inft/infer" \
  -H "Content-Type: application/json" \
  -d "{\"tokenId\": $TOKEN_ID, \"message\": \"What is the capital of France? One sentence.\"}" \
  -o "$TMP" --max-time 60

COMPUTE_MODEL=$(jval ".model")
COMPUTE_PROVIDER=$(jval ".provider")
COMPUTE_RESPONSE=$(jval ".response")

node -e "
  const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8'));
  console.log('  Agent:    ', d.agent);
  console.log('  Source:   ', d.source);
  console.log('  Model:    ', d.model);
  console.log('  Provider: ', d.provider);
  console.log('  Response: ', (d.response||'').substring(0, 200));
  console.log('  Success:  ', d.success);
"

COMPUTE_OK=$(jval ".success")
echo ""

# ── PHASE 5: Verify HCS messages ───────────────────────
echo "════��════════════════════════��═════════════════════"
echo "▶ PHASE 5: Verify HCS Messages (Mirror Node)"
echo "���══════════════════��══════════════════════���════════"
echo ""
echo "  Waiting 5s for mirror node indexing..."
sleep 5

if [ -n "$PROFILE_TOPIC" ]; then
  echo ""
  echo "  ── Profile Topic: $PROFILE_TOPIC ──"
  curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/$PROFILE_TOPIC/messages?limit=5&order=asc" -o "$TMP"
  node -e "
    const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8'));
    (d.messages||[]).forEach(m=>{
      const t=Buffer.from(m.message,'base64').toString('utf-8');
      let p; try{p=JSON.parse(t)}catch{p={raw:t}}
      console.log('    seq',m.sequence_number,'→',p.op||'profile');
      if(p.display_name) console.log('      name:',p.display_name,'| worldVerified:',p.properties?.worldVerified,'| humanId:',p.properties?.humanId);
      if(p.properties?.inftTokenId) console.log('      inftTokenId:',p.properties.inftTokenId,'| zgRootHash:',p.properties.zgRootHash);
      if(p.op) console.log('      agent:',p.agent_name,'| worldVerified:',p.world_verified);
    })
  "
fi

if [ -n "$REGISTRY_TOPIC" ]; then
  echo ""
  echo "  ── Registry Topic: $REGISTRY_TOPIC (last 4) ──"
  curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/$REGISTRY_TOPIC/messages?limit=4&order=desc" -o "$TMP"
  node -e "
    const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8'));
    (d.messages||[]).reverse().forEach(m=>{
      const t=Buffer.from(m.message,'base64').toString('utf-8');
      let p; try{p=JSON.parse(t)}catch{p={raw:t}}
      console.log('    seq',m.sequence_number,'→',p.op,'|',p.agent_name||p.m||'')
    })
  "
fi

if [ -n "$REP_TOPIC" ]; then
  echo ""
  echo "  ── Reputation Topic: $REP_TOPIC (last 4) ──"
  curl -s "https://testnet.mirrornode.hedera.com/api/v1/topics/$REP_TOPIC/messages?limit=4&order=desc" -o "$TMP"
  node -e "
    const d=JSON.parse(require('fs').readFileSync('$TMP','utf-8'));
    (d.messages||[]).reverse().forEach(m=>{
      const t=Buffer.from(m.message,'base64').toString('utf-8');
      let p; try{p=JSON.parse(t)}catch{p={raw:t}}
      console.log('    seq',m.sequence_number,'→',p.op,'|',p.tick,p.amt,'to',p.to,'|',(p.m||''))
    })
  "
fi

# cleanup temp
rm -f "$TMP" "$TMP2"

# ── PHASE 6: ALL HASHES + EXPLORER LINKS ───────────────
echo ""
echo ""
echo "╔══════════════════════════════════��════════════════════════════╗"
echo "║               DIVE AGENTS — FULL RESULTS                    ║"
echo "╚═════════════════════════════════════��═════════════════════════╝"
echo ""
echo "  Agent Name:       $AGENT_NAME"
echo "  iNFT Token ID:    #$TOKEN_ID"
echo "  Contract:         DIVE Agents (ERC-7857)"
echo "  Compute Working:  $COMPUTE_OK"
echo ""
echo "  ┌─── Hedera ───────────────────────────────────────────────┐"
echo "  │ Account ID:       $HEDERA_ID"
echo "  │ EVM Address:      $EVM_ADDR"
echo "  │ Profile Topic:    $PROFILE_TOPIC"
echo "  │ Registry Topic:   $REGISTRY_TOPIC"
echo "  │ Reputation Topic: $REP_TOPIC"
echo "  └───���──────────────────────────────────────────────────────┘"
echo ""
echo "  ┌─── 0G Chain ─────────────────────────────────────────────┐"
echo "  │ Mint TX:          $MINT_TX"
echo "  │ Upload TX:        $UPLOAD_TX"
echo "  │ Root Hash:        $ROOT_HASH"
echo "  └──────���────────────────��──────────────────────────────────┘"
echo ""
echo "  ┌─── World ID ─────────────────────────────────────────────┐"
echo "  │ Verified:         $WORLD_VERIFIED"
echo "  │ Human ID:         ${HUMAN_ID:-none}"
echo "  ��─────────────────────────────────────────────────���────────┘"
echo ""
echo "  ┌─── 0G Compute ─────────────────────────────────────���─────┐"
echo "  │ Model:            $COMPUTE_MODEL"
echo "  │ Provider:         $COMPUTE_PROVIDER"
echo "  └─────────��────────────────────────────────────────────────┘"
echo ""
echo "  ── EXPLORER LINKS ──────────────────────────────────────────"
echo ""
echo "  0G Chain:"
echo "    iNFT Mint:     https://chainscan-galileo.0g.ai/tx/$MINT_TX"
echo "    Storage Upload:https://chainscan-galileo.0g.ai/tx/$UPLOAD_TX"
echo "    DIVE Contract: https://chainscan-galileo.0g.ai/address/0x5F5B1E82189e7B51eDD1791068b6603BF12CE0d5"
echo ""
echo "  Hedera:"
echo "    Agent Account: https://hashscan.io/testnet/account/$HEDERA_ID"
echo "    Profile Topic: https://hashscan.io/testnet/topic/$PROFILE_TOPIC"
echo "    Registry Topic:https://hashscan.io/testnet/topic/$REGISTRY_TOPIC"
echo "    Reputation:    https://hashscan.io/testnet/topic/$REP_TOPIC"
echo ""
echo "  Mirror Node (raw JSON):"
echo "    Profile:       https://testnet.mirrornode.hedera.com/api/v1/topics/$PROFILE_TOPIC/messages?limit=5&order=asc"
echo "    Registry:      https://testnet.mirrornode.hedera.com/api/v1/topics/$REGISTRY_TOPIC/messages?limit=5&order=desc"
echo "    Reputation:    https://testnet.mirrornode.hedera.com/api/v1/topics/$REP_TOPIC/messages?limit=5&order=desc"
echo ""
if [ "$WORLD_VERIFIED" = "true" ]; then
echo "  World Chain:"
echo "    AgentBook:     https://worldscan.org/address/0xA23aB2712eA7BBa896930544C7d6636a96b944dA"
echo "    Agent Wallet:  https://worldscan.org/address/$EVM_ADDR"
fi
echo ""
echo "  0G Compute:"
echo "    Provider:      https://chainscan-galileo.0g.ai/address/$COMPUTE_PROVIDER"
echo ""
echo "  ── HCS-20 REPUTATION (per agent, up/down) ─────────────────"
echo "    Shared topic $REP_TOPIC tracks all agents."
echo "    mint = reputation UP, burn = reputation DOWN"
echo "    Each targets a specific Hedera account (per-agent balance)."
echo "    computeHCS20Balances() replays all messages for scores."
echo ""
echo "  ── FILES WITH THE FULL FLOW ────────────────────────────────"
echo "    Phase 1 (Hedera):  pages/api/inft/prepare-agent.ts"
echo "    Phase 2 (World ID):npx agentkit-cli + pages/api/world/register-agent.ts"
echo "    Phase 3 (iNFT+HCS):pages/api/inft/register-agent.ts"
echo "    Inference:         pages/api/inft/infer.ts"
echo "    HCS builders:      lib/hcs-standards.ts"
echo "    World ID:          lib/world-agentkit.ts"
echo "    Encryption:        lib/encrypt.ts"
echo "    Contract:          contracts/contracts/0g/DIVEAgents.sol"
echo "    ABI+Address:       lib/sparkinft-abi.ts"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  DONE ✓"
echo "════════════════════════════════════════��══════════════════════"
