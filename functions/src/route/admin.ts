import express, {Request, Response} from "express";
import cors from "cors";
import {createVote, setActiveVote} from "../types/vote";

const app = express();

app.use(cors());

app.post("/create", async (req: Request, res: Response) => {
  const prompt = req.body.prompt as string | undefined;
  const options = req.body.options as Array<string> | undefined;

  if (!prompt) {
    res.status(400).json({error: "Missing prompt"});
    return;
  }

  if (!options || options.length < 2) {
    res.status(400).json({error: "Missing options"});
    return;
  }

  res.json({id: await createVote(prompt, options)});
});

app.put("/setActive", async (req: Request, res: Response) => {
  const voteId = req.body.voteId as string | undefined;

  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  res.json({success: await setActiveVote(voteId)});
});

app.put("/closeVote", async (req: Request, res: Response) => {
  const voteId = req.body.voteId as string | undefined;

  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  res.json({success: await setActiveVote(voteId, false)});
});

export default app;
