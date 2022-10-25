import * as functions from "firebase-functions";
import express, {Request, Response} from "express";
import {
  getEntriesFromSnapshot,
  getVoteSnapshot,
  getVoteCounts,
  updateVoteEntry,
  getVote,
  getActiveVote,
} from "../types/vote";
import {updateVoteCount} from "../types/state";

type VoteResult = {success: true} | {error: string, code: number};

const app = express();

const vote = async (
    voteId: string | undefined,
    voter: string | undefined,
    voteIndex: number
): Promise<VoteResult> => {
  if (!voteId) {
    return {error: "Missing voteId", code: 400};
  }

  if (!voter) {
    return {error: "Missing voter", code: 400};
  }

  const vote = await getVoteSnapshot(voteId);
  if (!vote.exists) {
    return {error: "Vote not found", code: 404};
  }

  if (
    Number.isNaN(voteIndex) ||
    voteIndex < 0 ||
    voteIndex >= (vote.data()?.options ?? []).length
  ) {
    return {error: "Invalid vote index", code: 400};
  }

  await updateVoteEntry(vote, voter, voteIndex);
  await updateVoteCount();
  return {success: true};
};

app.post("/", async (req: Request, res: Response) => {
  const voteId = req.body.voteId as string | undefined;
  const voter = req.body.voter as string | undefined;
  const voteIndex = parseInt((req.body.voteIndex as string | undefined) ?? "");

  const result = await vote(voteId, voter, voteIndex);
  if ("error" in result) res.status(result.code).json({error: result.error});
  else res.json(result);
});

app.get("/", async (req: Request, res: Response) => {
  const voteId = req.query.voteId as string | undefined;
  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  const vote = await getVote(voteId);
  if (!vote) {
    res.status(404).json({error: "Vote not found"});
    return;
  }

  res.json(vote);
});

app.get("/entries", async (req: Request, res: Response) => {
  const voteId = req.query.voteId as string | undefined;
  const voteIndexStr = req.query.voteIndex as string | undefined;
  const voteIndex = parseInt(voteIndexStr ?? "");
  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  if (Number.isNaN(voteIndex) && voteIndexStr) {
    res.status(400).json({error: "Invalid voteIndex"});
    return;
  }

  const vote = await getVoteSnapshot(voteId);
  if (!vote.exists) {
    res.status(404).json({error: "Vote not found"});
    return;
  }

  if (
    !Number.isNaN(voteIndex) &&
    (voteIndex < 0 || voteIndex >= (vote.data()?.options ?? []).length)
  ) {
    res.status(400).json({error: "Invalid vote index"});
    return;
  }

  res.json(await getEntriesFromSnapshot(vote, voteIndex));
});

app.get("/count", async (req: Request, res: Response) => {
  const voteId = req.query.voteId as string | undefined;

  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  const vote = await getVoteSnapshot(voteId);
  if (!vote.exists) {
    res.status(404).json({error: "Vote not found"});
    return;
  }

  res.json((await Promise.all(getVoteCounts(vote))).map((query) => query.size));
});

app.get("/active", async (req: Request, res: Response) => {
  res.json({id: (await getActiveVote())?.id});
});

export const activeVoteState = functions.https.onCall(async () => {
  const vote = await getActiveVote();
  if (!vote) return undefined;

  const voteData = await vote.get();
  return {
    ...voteData.data(),
    voteId: vote.id,
    votes: (await Promise.all(getVoteCounts(voteData)))
        .map((query) => query.size),
  };
});

export const callVote = functions.https.onCall(async (data) => {
  const voteId = data.voteId as string | undefined;
  const voter = data.voter as string | undefined;
  const voteIndex = parseInt((data.voteIndex as string | undefined) ?? "");

  const result = await vote(voteId, voter, voteIndex);
  return "error" in result ? {error: result.error} : {success: true};
});

export default app;
