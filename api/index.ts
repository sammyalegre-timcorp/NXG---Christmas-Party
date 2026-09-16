/**
 * Vercel Serverless Function entry point
 * SPDX-License-Identifier: Apache-2.0
 */

import app, { ensureDbSynced } from '../src/serverApp.ts';

export default async function handler(req: any, res: any) {
  try {
    await ensureDbSynced();
  } catch (err) {
    console.warn('Vercel serverless sync warning:', err);
  }
  return app(req, res);
}
