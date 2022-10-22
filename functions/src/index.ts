import * as functions from "firebase-functions";
import {initializeApp} from "firebase-admin/app";

initializeApp();

import votingRoute from "./route/voting";
import adminRoute from "./route/admin";

export const vote = functions.https.onRequest(votingRoute);
export const admin = functions.https.onRequest(adminRoute);
