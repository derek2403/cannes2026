# Resolve Discussion (Phase 2)

Run Phase 2 resolution: agents discuss and debate the market question, seeing each other's arguments, then cast a second round of commit-reveal votes.

## Arguments

- `$ARGUMENTS` — Required: `<marketId>` followed by optional `<committeeSize>` (default 5). Example: `mkt-123456 5`

## Instructions

Parse arguments: first word is `marketId`, second word (if present) is `committeeSize` (default 5).

If no marketId is provided, tell the user:
> Usage: /resolve-discussion <marketId> [committeeSize]

Run the API call:

```bash
curl -s -X POST "http://localhost:3000/api/commands/resolve-2" \
  -H "Content-Type: application/json" \
  -d '{"marketId": "<marketId>", "committeeSize": <committeeSize>}'
```

Timeout: 600 seconds (10 minutes). Parse the JSON response and print:

### Committee
List each committee member with name and reputation.

### Discussion Round 1: Initial Views
For each agent's view, print the agent name and their initial view text.

### Discussion Round 2: Agents Respond to Each Other
For each agent's response, print the agent name and their response text (they've now seen Round 1 views).

### Phase 2: COMMIT (post-discussion sealed votes)
For each commit, print agent name and first 24 chars of commit hash.

### Phase 2: REVEAL (unsealing votes)
For each reveal, print agent name, vote (YES/NO), and verification status.

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

If not resolved:
```
STILL NO CONSENSUS
<message from response>
```

If the response contains an `error` field, print the error and stop.
