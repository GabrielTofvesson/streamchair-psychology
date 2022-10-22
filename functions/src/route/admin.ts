import * as functions from "firebase-functions";
import express, {Request, Response} from "express";
import cors from "cors";
import {createVote, setActiveVote, getAllVotes} from "../types/vote";
import {setState, updateState} from "../types/state";

const app = express();

app.use(cors());

app.post("/create", async (req: Request, res: Response) => {
  const prompt = req.body.prompt as string | undefined;
  const options = req.body.options as Array<string> | undefined;
  const description = req.body.description as string | undefined;

  if (!prompt) {
    res.status(400).json({error: "Missing prompt"});
    return;
  }

  if (!options || options.length < 2) {
    res.status(400).json({error: "Missing options"});
    return;
  }

  if (!description) {
    res.status(400).json({error: "Missing description"});
    return;
  }

  const id = await createVote(prompt, description, options);
  await setState(id);

  console.log("set state");

  res.json({id});
});

app.put("/setActive", async (req: Request, res: Response) => {
  const voteId = req.body.voteId as string | undefined;

  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  const success = await setActiveVote(voteId);
  if (success) {
    await updateState();
  }

  res.json({success});
});

app.put("/closeVote", async (req: Request, res: Response) => {
  const voteId = req.body.voteId as string | undefined;

  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  const success = await setActiveVote(voteId, false);
  if (success) {
    await updateState();
  }

  res.json({success});
});

export const getAllVotesCall = functions.https.onCall(async () =>
  (await getAllVotes()).docs.map((vote) => ({
    ...vote.data(),
    id: vote.id,
  }))
);

export default app;
