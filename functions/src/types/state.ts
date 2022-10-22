import {
    FieldValue,
    getFirestore,
  } from "firebase-admin/firestore";
  
  const db = getFirestore();

export type State = {
    currentVote: string | null
    voteChanges: number
    changes: number
};

const stateCollection = db.collection("state");

export const setState = (currentVote: string | null) =>
    stateCollection.doc("currentVote").set({
        currentVote,
        changes: 0,
        voteChanges: 0
    });

export const updateState = () =>
    stateCollection.doc("currentVote").update({changes: FieldValue.increment(1)});

export const updateVoteCount = () =>
    stateCollection.doc("currentVote").update({voteChanges: FieldValue.increment(1)});