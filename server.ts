/**
 * Node / Express server entry point for Cloud Run and development
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app, { ensureDbSynced } from './src/serverApp.ts';

const PORT = 3000;

async function startServer() {
  // Sync state with Firebase Firestore
  try {
    await ensureDbSynced(true);
    console.log('Synchronized database state with Firebase Firestore.');
  } catch (err: any) {
    console.warn('Initial Firestore synchronization warning:', err?.message || err);
  }

  // --- VITE & STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎄 Christmas Giveaway Poll Server running on http://localhost:${PORT}`);
  });
}

startServer();
