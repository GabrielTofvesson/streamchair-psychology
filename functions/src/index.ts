import * as functions from "firebase-functions";
import {initializeApp} from "firebase-admin/app";
import {
  DocumentReference,
  DocumentSnapshot,
  getFirestore,
  QuerySnapshot,
} from "firebase-admin/firestore";
import express, {Request, Response} from "express";

type VoteEntry = {
  username: string
  voteIndex: number
}

type Vote = {
  prompt: string
  options: Array<string>
}

initializeApp();


const db = getFirestore();
const app = express();

const getVote = async (id: string) =>
  db.collection("votes")
      .doc(id)
      .get() as Promise<DocumentSnapshot<Vote>>;
const getVoteEntry = async (vote: DocumentReference<Vote>, username: string) =>
  vote.collection("entries")
      .where("username", "==", username)
      .get() as Promise<QuerySnapshot<VoteEntry>>;
const makeVoteEntry = async (
    vote: DocumentReference<Vote>,
    username: string,
    voteIndex: number
) =>
  vote.collection("entries")
      .add({username, voteIndex}) as Promise<DocumentReference<VoteEntry>>;

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

  const vote = await getVote(voteId);
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
  if (entry.empty) {
    await makeVoteEntry(vote.ref, voter, voteIndex);
    res.json({success: true});
    return;
  }

  entry.docs[0].ref.update({voteIndex});
  res.json({success: true});
});

app.get("/", async (req: Request, res: Response) => {
  const voteId = req.query.voteId as string | undefined;
  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  const vote = await getVote(voteId);
  if (!vote.exists) {
    res.status(404).json({error: "Vote not found"});
    return;
  }

  res.json(vote.data());
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

  const vote = await getVote(voteId);
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

  const entryCollection = vote.ref.collection("entries");
  const entries = await (
    Number.isNaN(voteIndex) ?
      entryCollection :
      entryCollection.where("voteIndex", "==", voteIndex)
  ).get();
  res.json(entries.docs.map((d) => d.data()));
});

app.get("/count", async (req: Request, res: Response) => {
  const voteId = req.query.voteId as string | undefined;

  if (!voteId) {
    res.status(400).json({error: "Missing voteId"});
    return;
  }

  const vote = await getVote(voteId);
  if (!vote.exists) {
    res.status(404).json({error: "Vote not found"});
    return;
  }

  const collect = new Array<Promise<QuerySnapshot<VoteEntry>>>();
  for (let i = 0; i < (vote.data()?.options ?? []).length; i++) {
    collect.push(vote.ref
        .collection("entries")
        .where("voteIndex", "==", i)
        .get() as Promise<QuerySnapshot<VoteEntry>>
    );
  }

  res.json((await Promise.all(collect)).map((query) => query.size));
});

export const vote = functions.https.onRequest(app);
