# Create Market

Create a new prediction market. 10 agents propose market questions, discuss them, and vote on the best one.

## Arguments

- `$ARGUMENTS` — Theme for the market (e.g., "AI regulation and autonomous systems in 2026"). If empty, use "AI regulation and autonomous systems in 2026".

## Instructions

Run the create-market flow by calling the API:

```bash
curl -s -X POST "http://localhost:3000/api/commands/create-market" \
  -H "Content-Type: application/json" \
  -d '{"theme": "<theme>"}'
```

Timeout: 300 seconds (5 minutes). This takes a while as 10 agents each generate proposals.

Parse the JSON response and print the results in stages:

### Stage 1: Proposals
If `stages` contains a `proposal` stage, print each agent's proposal:
```
STAGE 1: PROPOSALS

[AgentName]
  <proposal text>

[AgentName2]
  <proposal text>
```

### Stage 2: Discussion
If `stages` contains a `discussion` stage, print each agent's discussion:
```
STAGE 2: DISCUSSION

[AgentName]
  <discussion text>
```

### Stage 3: Decision
If `stages` contains a `decision` stage, print the winner:
```
STAGE 3: DECISION

Winner: <agent> (Votes: X/Y)
```

### Final Output
Print:
```
Market ID: <marketId>
Question: <question>

Next step: /resolve-research <marketId>
```

If the response contains an `error` field, print the error and stop.
