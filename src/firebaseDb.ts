/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
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
import type { AppConfig, Poll, VoterResponse, DatabaseSchema } from './types.ts';

let firestoreInstance: Firestore | null = null;
let firebaseConfig: any = null;

const BUILTIN_FIREBASE_CONFIG = {
  projectId: 'gen-lang-client-0777938090',
  appId: '1:688017099761:web:0f10b30abd26bb48b01250',
  apiKey: 'AIzaSyBDQMpsewCxYLv62FbDEIfTIwldMTgWITk',
  authDomain: 'gen-lang-client-0777938090.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-christmasgiveawa-caf1cdf5-2d5b-4dcf-88db-246764435a20',
  storageBucket: 'gen-lang-client-0777938090.firebasestorage.app',
  messagingSenderId: '688017099761',
  oAuthClientId: '688017099761-f24fm851brk1kqsd2eborhgonhatp8km.apps.googleusercontent.com',
};

export function getFirestoreDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;

  try {
    if (process.env.FIREBASE_CONFIG) {
      try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      } catch (e) {}
    }

    if (!firebaseConfig) {
      try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
      } catch (e) {
        // Filesystem read may fail in serverless bundle
      }
    }

    if (!firebaseConfig) {
      firebaseConfig = BUILTIN_FIREBASE_CONFIG;
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    if (firebaseConfig.firestoreDatabaseId) {
      firestoreInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      firestoreInstance = getFirestore(app);
    }

    console.log('Firebase Firestore initialized successfully.');
    return firestoreInstance;
  } catch (err: any) {
    console.error('Failed to initialize Firebase Firestore:', err?.message || err);
    return null;
  }
}

/**
 * Loads entire database from Firestore.
 * If collections are empty, seeds them from fallback defaults.
 */
export async function loadFromFirestore(
  fallbackConfig: AppConfig,
  fallbackPolls: Poll[]
): Promise<DatabaseSchema> {
  const db = getFirestoreDb();
  if (!db) {
    return {
      config: fallbackConfig,
      polls: fallbackPolls,
      voters: [],
    };
  }

  try {
    // 1. Fetch Config
    let config = fallbackConfig;
    const configDocRef = doc(db, 'config', 'app');
    const configSnap = await getDoc(configDocRef);
    if (configSnap.exists()) {
      config = { ...fallbackConfig, ...(configSnap.data() as AppConfig) };
    } else {
      await setDoc(configDocRef, fallbackConfig);
    }

    // 2. Fetch Polls
    const pollsColRef = collection(db, 'polls');
    const pollsSnap = await getDocs(pollsColRef);
    let polls: Poll[] = [];

    if (!pollsSnap.empty) {
      pollsSnap.forEach((docSnap) => {
        polls.push(docSnap.data() as Poll);
      });
      polls.sort((a, b) => (a.order || 1) - (b.order || 1));
    } else {
      // Seed fallback polls into Firestore
      for (const poll of fallbackPolls) {
        await setDoc(doc(db, 'polls', poll.id), poll);
      }
      polls = [...fallbackPolls];
    }

    // 3. Fetch Voters
    const votersColRef = collection(db, 'voters');
    const votersSnap = await getDocs(votersColRef);
    const voters: VoterResponse[] = [];

    if (!votersSnap.empty) {
      votersSnap.forEach((docSnap) => {
        voters.push(docSnap.data() as VoterResponse);
      });
      voters.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    console.log(`Loaded from Firebase Firestore: ${polls.length} polls, ${voters.length} voter entries.`);
    return { config, polls, voters };
  } catch (err: any) {
    console.error('Error reading from Firebase Firestore, using fallback:', err?.message || err);
    return {
      config: fallbackConfig,
      polls: fallbackPolls,
      voters: [],
    };
  }
}

/**
 * Persists a voter ballot into Firebase Firestore
 */
export async function persistVoterToFirestore(voter: VoterResponse): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await setDoc(doc(db, 'voters', voter.id), voter);
    console.log(`Saved vote for ${voter.voterName} to Firestore.`);
  } catch (err: any) {
    console.error(`Failed to save vote to Firestore for ${voter.voterName}:`, err?.message || err);
  }
}

/**
 * Persists or updates a poll in Firebase Firestore
 */
export async function persistPollToFirestore(poll: Poll): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await setDoc(doc(db, 'polls', poll.id), poll);
    console.log(`Saved poll "${poll.title}" (${poll.id}) to Firestore.`);
  } catch (err: any) {
    console.error(`Failed to save poll to Firestore:`, err?.message || err);
  }
}

/**
 * Deletes a poll from Firebase Firestore
 */
export async function removePollFromFirestore(pollId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await deleteDoc(doc(db, 'polls', pollId));
    console.log(`Deleted poll ${pollId} from Firestore.`);
  } catch (err: any) {
    console.error(`Failed to delete poll ${pollId} from Firestore:`, err?.message || err);
  }
}

/**
 * Persists application config to Firebase Firestore
 */
export async function persistConfigToFirestore(config: AppConfig): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await setDoc(doc(db, 'config', 'app'), config);
    console.log('Saved config to Firestore.');
  } catch (err: any) {
    console.error('Failed to save config to Firestore:', err?.message || err);
  }
}

/**
 * Clears all voter entries from Firebase Firestore
 */
export async function clearAllVotersFromFirestore(voterIds: string[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const batch = writeBatch(db);
    for (const id of voterIds) {
      batch.delete(doc(db, 'voters', id));
    }
    await batch.commit();
    console.log(`Cleared ${voterIds.length} votes from Firestore.`);
  } catch (err: any) {
    console.error('Failed to clear votes from Firestore:', err?.message || err);
  }
}

/**
 * Deletes a single voter entry from Firebase Firestore
 */
export async function removeVoterFromFirestore(voterId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await deleteDoc(doc(db, 'voters', voterId));
    console.log(`Deleted voter ${voterId} from Firestore.`);
  } catch (err: any) {
    console.error(`Failed to delete voter ${voterId} from Firestore:`, err?.message || err);
  }
}

/**
 * Updates a single voter entry in Firebase Firestore
 */
export async function updateVoterInFirestore(voter: VoterResponse): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    await setDoc(doc(db, 'voters', voter.id), voter);
    console.log(`Updated voter ${voter.id} (${voter.voterName}) in Firestore.`);
  } catch (err: any) {
    console.error(`Failed to update voter ${voter.id} in Firestore:`, err?.message || err);
  }
}

