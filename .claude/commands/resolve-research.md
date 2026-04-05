# Resolve Research (Phase 1)

Run Phase 1 resolution: agents independently research the market question and cast blind commit-reveal votes.

## Arguments

- `$ARGUMENTS` — Required: `<marketId>` followed by optional `<committeeSize>` (default 5). Example: `mkt-123456 5`

## Instructions

Parse arguments: first word is `marketId`, second word (if present) is `committeeSize` (default 5).

If no marketId is provided, tell the user:
> Usage: /resolve-research <marketId> [committeeSize]
> 
> Get market IDs by checking `data/markets.json` or running:
> ```
> curl http://localhost:3000/api/markets | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')).forEach(m=>console.log(m.id, m.resolution?.question))"
> ```

Run the API call:

```bash
curl -s -X POST "http://localhost:3000/api/commands/resolve-1" \
  -H "Content-Type: application/json" \
  -d '{"marketId": "<marketId>", "committeeSize": <committeeSize>}'
```

Timeout: 300 seconds. Parse the JSON response and print:

### Committee
List each committee member with name, reputation, and iNFT token ID.

### Phase 1: COMMIT (sealed votes)
For each commit, print the agent name and first 24 chars of the commit hash.

### Phase 1: REVEAL (unsealing votes + research)
For each reveal, print:
- Agent name, vote (YES/NO), verification status
- Full reasoning text

### Tally
Print YES count, NO count, and percentages.

### Result
If `resolved` is true:
```
RESOLVED: <consensus>

Reputation Updates:
  <agent>: +/-<change> -> <newRep> (correct/wrong)

Next: /peer-vote <marketId>
```

If `resolved` is false:
```
NO CONSENSUS (need 70%)

Agents must discuss. Run Phase 2:
/resolve-discussion <marketId>
```

If the response contains an `error` field, print the error and stop.
