import * as functions from "firebase-functions";
import express, {Request, Response} from "express";
import {
  getEntriesFromSnapshot,
  getVoteSnapshot,
  getVoteCounts,
  getVoteEntry,
  makeVoteEntry,
  updateVoteEntry,
  getVote,
  getActiveVote,
} from "../types/vote";


const app = express();

app.post("/", async (req: Request, res: Response) => {
  const voteId = req.body.voteId as string | undefined;
  const voter = req.body.voter as string | undefined;
  const voteIndex = parseInt((req.body.voteIndex as string | undefined) ?? "");

  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  if (!voter) {
    res.status(400).json({error: "Missing voter"});
    return;
  }

  const vote = await getVoteSnapshot(voteId);
  if (!vote.exists) {
    res.status(404).json({error: "Vote not found"});
    return;
  }

  if (
    Number.isNaN(voteIndex) ||
    voteIndex < 0 ||
    voteIndex >= (vote.data()?.options ?? []).length
  ) {
    res.status(400).json({error: "Invalid vote index"});
    return;
  }

  const entry = await getVoteEntry(vote.ref, voter);
  if (!entry) {
    await makeVoteEntry(vote.ref, voter, voteIndex);
    res.json({success: true});
    return;
  }

  await updateVoteEntry(entry, voteIndex);
  res.json({success: true});
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

export default app;
