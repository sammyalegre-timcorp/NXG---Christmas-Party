/**
 * Client-Side Direct Firestore Fallback for Vercel
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import type { AdminDataResponse, AppConfig, Poll, VoterResponse } from './types.ts';

const FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0777938090',
  appId: '1:688017099761:web:0f10b30abd26bb48b01250',
  apiKey: 'AIzaSyBDQMpsewCxYLv62FbDEIfTIwldMTgWITk',
  authDomain: 'gen-lang-client-0777938090.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-christmasgiveawa-caf1cdf5-2d5b-4dcf-88db-246764435a20',
  storageBucket: 'gen-lang-client-0777938090.firebasestorage.app',
  messagingSenderId: '688017099761',
};

const DEFAULT_CONFIG: AppConfig = {
  deadlinePST: '2026-09-18T18:00:00+08:00',
  deadlineLabel: 'September 18, 6:00 PM PST (Philippine Standard Time)',
  eventTitle: 'Christmas Giveaway Poll',
  eventSubtitle: 'Vote for your preferred Christmas giveaway item. Choose one option below!',
  companyName: 'Holiday Cheer Committee',
};

let clientDb: Firestore | null = null;

export function getClientFirestore(): Firestore {
  if (clientDb) return clientDb;
  const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  clientDb = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);
  return clientDb;
}

export function calculateTallies(polls: Poll[], voters: VoterResponse[]) {
  return polls.map((poll) => {
    const totalVotesForPoll = voters.filter((v) => !!v.votes[poll.id]).length;
    const optionCounts: Record<string, number> = {};

    poll.options.forEach((opt) => {
      optionCounts[opt.id] = 0;
    });

    voters.forEach((v) => {
      const selected = v.votes[poll.id];
      if (selected && optionCounts[selected] !== undefined) {
        optionCounts[selected]++;
      }
    });

    const optionsTally = poll.options.map((opt) => {
      const count = optionCounts[opt.id] || 0;
      const percentage = totalVotesForPoll > 0 ? Math.round((count / totalVotesForPoll) * 1000) / 10 : 0;
      return {
        id: opt.id,
        text: opt.text,
        description: opt.description,
        badge: opt.badge,
        imageUrl: opt.imageUrl,
        count,
        percentage,
      };
    });

    return {
      pollId: poll.id,
      pollTitle: poll.title,
      totalVotes: totalVotesForPoll,
      options: optionsTally,
    };
  });
}

export async function fetchAdminDataDirect(): Promise<AdminDataResponse> {
  const db = getClientFirestore();

  // 1. Config
  let config = DEFAULT_CONFIG;
  try {
    const configSnap = await getDoc(doc(db, 'config', 'app'));
    if (configSnap.exists()) {
      config = { ...DEFAULT_CONFIG, ...(configSnap.data() as AppConfig) };
    }
  } catch (e) {
    console.warn('Failed to load config from direct Firestore, using default:', e);
  }

  // 2. Polls
  const polls: Poll[] = [];
  try {
    const pollsSnap = await getDocs(collection(db, 'polls'));
    pollsSnap.forEach((d) => polls.push(d.data() as Poll));
    polls.sort((a, b) => (a.order || 1) - (b.order || 1));
  } catch (e) {
    console.warn('Failed to load polls from direct Firestore:', e);
  }

  // 3. Voters
  const voters: VoterResponse[] = [];
  try {
    const votersSnap = await getDocs(collection(db, 'voters'));
    votersSnap.forEach((d) => voters.push(d.data() as VoterResponse));
    voters.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (e) {
    console.warn('Failed to load voters from direct Firestore:', e);
  }

  const tallies = calculateTallies(polls, voters);

  return {
    config,
    polls,
    tallies,
    voters,
    totalUniqueVoters: voters.length,
  };
}

export async function directSavePoll(poll: Poll): Promise<void> {
  const db = getClientFirestore();
  await setDoc(doc(db, 'polls', poll.id), poll);
}

export async function directDeletePoll(pollId: string): Promise<void> {
  const db = getClientFirestore();
  await deleteDoc(doc(db, 'polls', pollId));
}

export async function directSaveConfig(config: AppConfig): Promise<void> {
  const db = getClientFirestore();
  await setDoc(doc(db, 'config', 'app'), config);
}

export async function directClearAllVotes(voterIds: string[]): Promise<void> {
  const db = getClientFirestore();
  const batch = writeBatch(db);
  for (const id of voterIds) {
    batch.delete(doc(db, 'voters', id));
  }
  await batch.commit();
}

export async function directSubmitVote(
  voterName: string,
  votes: Record<string, string>,
  configDeadline?: string
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const db = getClientFirestore();
  const trimmedName = voterName.trim();
  const identifier = trimmedName.toLowerCase();

  if (configDeadline) {
    const deadline = new Date(configDeadline);
    if (!isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
      throw new Error('Voting has concluded as the countdown deadline has passed.');
    }
  }

  // Check if voter already voted in Firestore
  const votersSnap = await getDocs(collection(db, 'voters'));
  let alreadyVoted = false;
  votersSnap.forEach((docSnap) => {
    const v = docSnap.data() as VoterResponse;
    if (v.voterIdentifier === identifier) {
      alreadyVoted = true;
    }
  });

  if (alreadyVoted) {
    throw new Error(`A vote has already been submitted under the name "${trimmedName}". Each person may only vote once.`);
  }

  const newVote: VoterResponse = {
    id: 'vote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    voterName: trimmedName,
    voterIdentifier: identifier,
    votes,
    timestamp: new Date().toISOString(),
  };

  await setDoc(doc(db, 'voters', newVote.id), newVote);

  return {
    success: true,
    message: 'Your Christmas Giveaway vote has been sealed! Best of luck in the raffle!',
    timestamp: newVote.timestamp,
  };
}

