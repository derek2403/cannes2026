# Peer Vote

Run peer voting: agents rate each other's reliability on a 0-10 scale based on their performance.

## Arguments

- `$ARGUMENTS` — Optional: `<marketId>`. If provided, ratings are scoped to that market's resolution. If empty, agents rate overall.

## Instructions

Build the request body:
- If `$ARGUMENTS` is provided, use `{"marketId": "<marketId>"}`
- If empty, use `{}`

Run the API call:

```bash
curl -s -X POST "http://localhost:3000/api/commands/peer-vote" \
  -H "Content-Type: application/json" \
  -d '<body>'
```

Timeout: 120 seconds. Parse the JSON response and print:

### Individual Ratings
For each agent's vote, show who they rated and the scores:
```
[AgentName] -> Agent1:8, Agent2:6, Agent3:9, ...
```

### Ranking (avg peer score)
Print the ranking sorted by average score:
```
1. AgentName — 8.5/10
2. AgentName — 7.2/10
...
```

### Save ID
Print the vote ID from `voteId` in the response.

If the response contains an `error` field, print the error and stop.
