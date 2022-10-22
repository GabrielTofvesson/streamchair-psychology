import * as functions from "firebase-functions";
import {initializeApp} from "firebase-admin/app";

initializeApp();

import votingRoute, {activeVoteState} from "./route/voting";
import adminRoute, {getAllVotesCall} from "./route/admin";

export const vote = functions.https.onRequest(votingRoute);
export const admin = functions.https.onRequest(adminRoute);
export const activeVote = activeVoteState;
export const getAllVotes = getAllVotesCall;
