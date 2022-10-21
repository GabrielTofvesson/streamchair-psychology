import * as functions from "firebase-functions";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirebase } from "firebase-admin/firestore";
import express, { Request, Response } from "express";

type VoteEntry = {
  username: string
  voteIndex: number
}

type Vote = {
  prompt: string
  entries: VoteEntry[]
}


initializeApp();


const db = getFirebase();
const app = express();

app.post("/vote", (req: Request, res: Response) => {
  
});

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
