import {
  DocumentReference,
  DocumentSnapshot,
  getFirestore,
  QuerySnapshot,
} from "firebase-admin/firestore";

const db = getFirestore();
const votesCollection = db.collection("votes");
const entriesCollectionName = "entries";
const usernameField = "username";
const voteIndexField = "voteIndex";
const optionsField = "options";
const activeField = "active";

export type VoteEntry = {
    [usernameField]: string
    [voteIndexField]: number
};

export type Vote = {
    prompt: string
    description: string
    [optionsField]: Array<string>
    [activeField]?: boolean
};

export const getEntriesCollection = (vote: DocumentReference<Vote>) =>
  vote.collection(entriesCollectionName);

export const getAllVotes = async () => await votesCollection.get();

export const getVoteSnapshot = async (id: string) =>
    votesCollection
        .doc(id)
        .get() as Promise<DocumentSnapshot<Vote>>;
export const getVote = async (id: string) => (await getVoteSnapshot(id)).data();
export const getVoteEntry = async (
    vote: DocumentReference<Vote>,
    username: string
) =>
  (await getEntriesCollection(vote)
      .where(usernameField, "==", username)
      .get() as QuerySnapshot<VoteEntry>).docs[0]?.ref;
export const updateVoteEntry = async (
    vote: DocumentSnapshot<Vote>,
    username: string,
    voteIndex: number
) =>
  vote.ref.collection(entriesCollectionName).doc(username).set({[voteIndexField]: voteIndex});
export const makeVoteEntry = async (
    vote: DocumentReference<Vote>,
    username: string,
    voteIndex: number
) =>
  vote.collection(entriesCollectionName)
      .add({
        [usernameField]: username,
        [voteIndexField]: voteIndex,
      }) as Promise<DocumentReference<VoteEntry>>;

export const getVoteCounts = (
    vote: DocumentSnapshot<Vote>
): Array<Promise<QuerySnapshot<VoteEntry>>> => {
  const collect = new Array<Promise<QuerySnapshot<VoteEntry>>>();
  for (let i = 0; i < (vote.data()?.options ?? []).length; i++) {
    collect.push(getEntriesCollection(vote.ref)
        .where(voteIndexField, "==", i)
        .get() as Promise<QuerySnapshot<VoteEntry>>
    );
  }

  return collect;
};

export const getEntriesFromSnapshot = async (
    snapshot: DocumentSnapshot<Vote>,
    voteIndex: number
): Promise<VoteEntry[]> => {
  const entryCollection = getEntriesCollection(snapshot.ref);
  return (await (
        Number.isNaN(voteIndex) ?
            entryCollection :
            entryCollection.where(voteIndexField, "==", voteIndex)
  ).get()
  ).docs.map((doc) => doc.data() as VoteEntry);
};

export const createVote = async (
    prompt: string,
    description: string,
    options: Array<string>
) => {
  const vote = await votesCollection.add({
    prompt,
    description,
    [optionsField]: options,
  });
  return vote.id;
};

export const getActiveVote = async () =>
    (await votesCollection.where(activeField, "==", true)
        .get()).docs[0]?.ref as DocumentReference<Vote> | undefined;
export const setActiveVote = async (id: string, active = true) => {
  const activeVote = await getActiveVote();
  if (activeVote) {
    await activeVote.update({active: false});
  }

  const vote = await getVoteSnapshot(id);
  if (!vote.exists) {
    return false;
  }

  await vote.ref.update({active});
  return true;
};
