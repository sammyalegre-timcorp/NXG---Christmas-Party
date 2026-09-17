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
  eventTitle: 'Nexusguard Christmas Celebration & Year-End Polls',
  eventSubtitle: 'Vote for your preferred Christmas giveaway item and party theme. Choose one option for each poll below!',
  companyName: 'Nexusguard Holiday Committee',
};

const DEFAULT_POLLS: Poll[] = [
  {
    id: 'poll-giveaway',
    title: 'Christmas Giveaway Poll',
    description: 'Vote for your preferred Christmas giveaway item. Choose one option below!',
    category: 'Christmas Giveaway',
    active: true,
    order: 1,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-1',
        text: 'Apple iPad Air Bundle with Apple Pencil',
        description: 'Latest model iPad with Apple Pencil for digital illustration, notes, and entertainment.',
        badge: 'Gadget',
        imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-2',
        text: '55" Samsung 4K Smart UHD TV',
        description: 'Ultra-vibrant 4K cinema display for holiday family movies and entertainment.',
        badge: 'Home Appliance',
        imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-3',
        text: '₱25,000 Puregold / SM Shopping Spree',
        description: 'Flexible universal vouchers for pure holiday shopping or family groceries.',
        badge: 'Gift Vouchers',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-4',
        text: 'Dyson Supersonic Hair Dryer / Luxury Styler',
        description: 'Engineered for all hair types with intelligent heat control protection.',
        badge: 'Lifestyle',
        imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-5',
        text: 'PlayStation 5 Console Gaming Bundle',
        description: 'Next-gen gaming with DualSense wireless controller and games.',
        badge: 'Gaming',
        imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-6',
        text: 'Gourmet Noche Buena Feast Hamper & Wine',
        description: 'Smoked Christmas ham, aged Queso de Bola, imported pasta, panettone, and sparkling wine.',
        badge: 'Holiday Feast',
        imageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-7',
        text: 'Sony Noise-Cancelling Wireless Headphones',
        description: 'Industry-leading noise cancellation, crystal-clear calls, and 30-hour battery.',
        badge: 'Audio',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-8',
        text: 'Nespresso Compact Espresso Machine & Frother',
        description: 'Cafe-grade espresso, cappuccinos, and lattes brewed in seconds at home.',
        badge: 'Coffee Barista',
        imageUrl: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
  {
    id: 'poll-1789532626975',
    title: 'Choose your preferred Christmas Theme',
    description: 'Vote for your favorite holiday celebration theme. Select one choice below!',
    category: 'Christmas Theme',
    active: true,
    order: 2,
    createdAt: new Date().toISOString(),
    options: [
      {
        id: 'opt-1789532626975-1',
        text: 'Cowboy',
        description: 'Wild West holiday boots, hats, denim, and barn dance atmosphere.',
        badge: 'Western',
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-1789532626975-2',
        text: 'Iconic Christmas Character',
        description: 'Dress as Santa, Mrs. Claus, the Grinch, Jack Frost, or Rudolph.',
        badge: 'Festive Costume',
        imageUrl: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-1789532626975-3',
        text: 'Retro Glam',
        description: 'Dazzling 70s/80s glitz, sequins, disco ball sparkle, and gold accents.',
        badge: 'Vintage Party',
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'opt-1789532626975-4',
        text: 'World Cup',
        description: 'Represent your favorite national team jersey, stadium fan energy, and trophy glory.',
        badge: 'Sports Arena',
        imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
      },
    ],
  },
];

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
  let polls: Poll[] = [];
  try {
    const pollsSnap = await getDocs(collection(db, 'polls'));
    pollsSnap.forEach((d) => polls.push(d.data() as Poll));
    polls.sort((a, b) => (a.order || 1) - (b.order || 1));
  } catch (e) {
    console.warn('Failed to load polls from direct Firestore:', e);
  }

  if (polls.length === 0) {
    polls = [...DEFAULT_POLLS];
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

export async function directCheckVoter(name: string): Promise<{
  hasVoted: boolean;
  voterName?: string;
  timestamp?: string;
  votes?: Record<string, string>;
}> {
  const db = getClientFirestore();
  const identifier = name.trim().toLowerCase();
  if (!identifier) return { hasVoted: false };

  const votersSnap = await getDocs(collection(db, 'voters'));
  for (const docSnap of votersSnap.docs) {
    const v = docSnap.data() as VoterResponse;
    if (v.voterIdentifier === identifier) {
      return {
        hasVoted: true,
        voterName: v.voterName,
        timestamp: v.timestamp,
        votes: v.votes,
      };
    }
  }
  return { hasVoted: false };
}

export async function directDeleteVoter(voterId: string): Promise<void> {
  const db = getClientFirestore();
  await deleteDoc(doc(db, 'voters', voterId));
}

export async function directUpdateVoter(
  voterId: string,
  updatedData: { voterName: string; votes: Record<string, string> }
): Promise<VoterResponse> {
  const db = getClientFirestore();
  const voterDocRef = doc(db, 'voters', voterId);
  const snap = await getDoc(voterDocRef);
  if (!snap.exists()) {
    throw new Error('Voter entry not found.');
  }
  const current = snap.data() as VoterResponse;
  const trimmedName = updatedData.voterName.trim();
  const updatedVoter: VoterResponse = {
    ...current,
    voterName: trimmedName,
    voterIdentifier: trimmedName.toLowerCase(),
    votes: updatedData.votes,
  };
  await setDoc(voterDocRef, updatedVoter);
  return updatedVoter;
}



