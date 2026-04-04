import type { NextApiRequest, NextApiResponse } from "next";
import { getClient } from "@/lib/hedera";
import {
  createTopic,
  submitMessage,
  readTopicMessages,
  getOperatorKey,
  buildHCS16FloraCreated,
  buildHCS16Message,
  buildHCS16Vote,
  buildHCS16StateUpdate,
  buildHCS16Commit,
  buildHCS16Reveal,
  buildHCS16Discussion,
  generateSalt,
  hashVote,
  computeVoteTally,
} from "@/lib/hcs-standards";
import type { VoteOption } from "@/lib/hcs-standards";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body;

  try {
    const client = getClient();

    switch (action) {
      // ── Flora Management ──────────────────────────────────

      case "create": {
        const { floraId } = req.body;
        const operatorKey = getOperatorKey();
        const operatorId = process.env.HEDERA_OPERATOR_ID!;
        const submitKey = operatorKey.publicKey;

        const cTopicId = await createTopic(client, `hcs-16:${floraId}:0`, submitKey);
        const tTopicId = await createTopic(client, `hcs-16:${floraId}:1`, submitKey);
        const sTopicId = await createTopic(client, `hcs-16:${floraId}:2`, submitKey);

        const msg = buildHCS16FloraCreated(
          operatorId, cTopicId, tTopicId, sTopicId,
          `Flora ${floraId} initialized`
        );
        const result = await submitMessage(client, cTopicId, msg);

        client.close();
        return res.json({
          floraId,
          communicationTopicId: cTopicId,
          transactionTopicId: tTopicId,
          stateTopicId: sTopicId,
          ...result,
        });
      }

      case "message": {
        const { communicationTopicId, content } = req.body;
        const operatorId = process.env.HEDERA_OPERATOR_ID!;
        const msg = buildHCS16Message(operatorId, operatorId, content);
        const result = await submitMessage(client, communicationTopicId, msg);
        client.close();
        return res.json(result);
      }

      case "vote": {
        const { communicationTopicId, candidateAccountId, approve } = req.body;
        const operatorId = process.env.HEDERA_OPERATOR_ID!;
        const msg = buildHCS16Vote(operatorId, operatorId, candidateAccountId, approve);
        const result = await submitMessage(client, communicationTopicId, msg);
        client.close();
        return res.json(result);
      }

      case "state": {
        const { stateTopicId, hash, epoch } = req.body;
        const operatorId = process.env.HEDERA_OPERATOR_ID!;
        const msg = buildHCS16StateUpdate(operatorId, operatorId, hash, epoch);
        const result = await submitMessage(client, stateTopicId, msg);
        client.close();
        return res.json(result);
      }

      case "read": {
        const { topicId } = req.body;
        client.close();
        const messages = await readTopicMessages(topicId);
        return res.json({ messages, count: messages.length });
      }

      // ── Commit-Reveal Voting ──────────────────────────────────
      // Phase 1: blind vote → commit hash to HCS
      // Phase 2: discussion → evidence & debate on HCS
      // Phase 3: final vote → commit hash again

      case "commit": {
        // Agent commits hash(vote|salt) — vote stays hidden until reveal
        const { communicationTopicId, vote, phase, marketId } = req.body;
        const operatorId = process.env.HEDERA_OPERATOR_ID!;

        const salt = generateSalt();
        const commitHash = hashVote(vote as VoteOption, salt);

        const msg = buildHCS16Commit(operatorId, operatorId, phase, commitHash, marketId);
        const result = await submitMessage(client, communicationTopicId, msg);

        client.close();
        // Return salt — agent MUST save this for reveal phase
        return res.json({
          ...result,
          salt,
          commitHash,
          vote, // only returned to the committer, not visible on-chain
          phase,
          warning: "SAVE THE SALT — you need it to reveal your vote",
        });
      }

      case "reveal": {
        // Agent reveals vote + salt — anyone can verify hash matches commit
        const { communicationTopicId, vote, salt, phase, marketId } = req.body;
        const operatorId = process.env.HEDERA_OPERATOR_ID!;

        const msg = buildHCS16Reveal(
          operatorId, operatorId, phase,
          vote as VoteOption, salt, marketId
        );
        const result = await submitMessage(client, communicationTopicId, msg);

        client.close();
        return res.json({ ...result, vote, phase });
      }

      case "discussion": {
        // Phase 2: post evidence & reasoning between vote rounds
        const { communicationTopicId, marketId, content, evidenceUrl } = req.body;
        const operatorId = process.env.HEDERA_OPERATOR_ID!;

        const msg = buildHCS16Discussion(
          operatorId, operatorId, marketId, content, evidenceUrl
        );
        const result = await submitMessage(client, communicationTopicId, msg);

        client.close();
        return res.json(result);
      }

      case "tally": {
        // Read all messages, verify reveals against commits, enforce time windows
        const { communicationTopicId, marketId, committeeMembers, deadlines } = req.body;
        client.close();

        const messages = await readTopicMessages(communicationTopicId);
        const tally = computeVoteTally(
          messages,
          marketId,
          committeeMembers || [],
          deadlines // { phase1CommitDeadline, phase1RevealDeadline, phase3CommitDeadline, phase3RevealDeadline }
        );

        return res.json(tally);
      }

      default:
        client.close();
        return res.status(400).json({
          error: "Invalid action. Use: create, commit, reveal, discussion, tally, message, vote, state, read",
        });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}
