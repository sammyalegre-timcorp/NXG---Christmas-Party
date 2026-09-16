import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type { AppConfig, Poll, VoterResponse } from './src/types.ts';
import {
  loadFromFirestore,
  persistVoterToFirestore,
  persistPollToFirestore,
  removePollFromFirestore,
  persistConfigToFirestore,
  clearAllVotersFromFirestore,
} from './src/firebaseDb.ts';

interface DatabaseSchema {
  config: AppConfig;
  polls: Poll[];
  voters: VoterResponse[];
}

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Default initial config and festive polls
const DEFAULT_CONFIG: AppConfig = {
  // Sept 18, 2026 at 6:00 PM Philippine Standard Time (UTC+8)
  deadlinePST: '2026-09-18T18:00:00+08:00',
  deadlineLabel: 'September 18, 6:00 PM PST (Philippine Standard Time)',
  eventTitle: 'Christmas Giveaway Poll',
  eventSubtitle: 'Vote for your preferred Christmas giveaway item. Choose one option below!',
  companyName: 'Holiday Cheer Committee',
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
];

function initDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
        polls: Array.isArray(parsed.polls) && parsed.polls.length > 0 ? parsed.polls : DEFAULT_POLLS,
        voters: Array.isArray(parsed.voters) ? parsed.voters : [],
      };
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }

  const initialDb: DatabaseSchema = {
    config: DEFAULT_CONFIG,
    polls: DEFAULT_POLLS,
    voters: [],
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

let db: DatabaseSchema = initDatabase();

function calculateTallies(polls: Poll[], voters: VoterResponse[]) {
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

function escapeCsvField(val: string | number | undefined | null): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function startServer() {
  // Sync state with Firebase Firestore
  try {
    const firestoreData = await loadFromFirestore(db.config, db.polls);
    db = firestoreData;
    saveDatabase(db);
    console.log('Synchronized database state with Firebase Firestore.');
  } catch (err: any) {
    console.warn('Initial Firestore synchronization warning:', err?.message || err);
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // --- PUBLIC API ENDPOINTS ---

  // Get active polls and configuration (strictly without results or tallies)
  app.get('/api/public-polls', (req, res) => {
    const activePolls = db.polls
      .filter((p) => p.active)
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        options: p.options.map((o) => ({
          id: o.id,
          text: o.text,
          description: o.description,
          badge: o.badge,
          imageUrl: o.imageUrl,
        })),
        active: p.active,
        order: p.order,
        createdAt: p.createdAt,
      }));

    res.json({
      config: db.config,
      polls: activePolls,
    });
  });

  // Check if voter has already voted by name
  app.get('/api/check-voter', (req, res) => {
    const name = String(req.query.name || '').trim().toLowerCase();
    if (!name) {
      return res.json({ hasVoted: false });
    }
    const found = db.voters.find((v) => v.voterIdentifier === name);
    if (found) {
      return res.json({
        hasVoted: true,
        voterName: found.voterName,
        timestamp: found.timestamp,
      });
    }
    return res.json({ hasVoted: false });
  });

  // Submit vote
  app.post('/api/vote', (req, res) => {
    const { voterName, votes } = req.body || {};

    if (!voterName || typeof voterName !== 'string' || voterName.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide your name (at least 2 characters).' });
    }

    const trimmedName = voterName.trim();
    const identifier = trimmedName.toLowerCase();

    // Check deadline
    const now = new Date();
    const deadline = new Date(db.config.deadlinePST);
    if (!isNaN(deadline.getTime()) && now.getTime() > deadline.getTime()) {
      return res.status(400).json({ error: 'Voting has concluded as the countdown deadline has passed.' });
    }

    // Single-vote verification: check if this name has already voted
    const alreadyVoted = db.voters.some((v) => v.voterIdentifier === identifier);
    if (alreadyVoted) {
      return res.status(409).json({
        error: `A vote has already been submitted under the name "${trimmedName}". Each person may only vote once.`,
      });
    }

    // Validate votes map
    if (!votes || typeof votes !== 'object' || Object.keys(votes).length === 0) {
      return res.status(400).json({ error: 'Please select your choices before submitting your vote.' });
    }

    // Ensure all active polls were voted on
    const activePolls = db.polls.filter((p) => p.active);
    for (const poll of activePolls) {
      const selected = votes[poll.id];
      if (!selected) {
        return res.status(400).json({ error: `Please make a selection for "${poll.title}".` });
      }
      const optionExists = poll.options.some((o) => o.id === selected);
      if (!optionExists) {
        return res.status(400).json({ error: `Invalid option selected for "${poll.title}".` });
      }
    }

    const newVote: VoterResponse = {
      id: 'vote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      voterName: trimmedName,
      voterIdentifier: identifier,
      votes,
      timestamp: new Date().toISOString(),
    };

    db.voters.push(newVote);
    saveDatabase(db);
    // Persist to Firebase Firestore
    persistVoterToFirestore(newVote).catch((e) => console.error('Firestore vote error:', e));

    // Response explicitly gives confirmation, NO TALLY OR RESULTS
    res.json({
      success: true,
      message: 'Your Christmas Giveaway vote has been sealed! Best of luck in the raffle!',
      voterName: trimmedName,
      timestamp: newVote.timestamp,
    });
  });

  // --- ADMIN API ENDPOINTS ---

  // Get full admin dashboard data (including tallies, voters, polls)
  app.get('/api/admin/data', (req, res) => {
    const tallies = calculateTallies(db.polls, db.voters);
    res.json({
      config: db.config,
      polls: db.polls,
      tallies,
      voters: db.voters,
      totalUniqueVoters: db.voters.length,
    });
  });

  // Add new poll
  app.post('/api/admin/polls', (req, res) => {
    const { title, description, category, options } = req.body;
    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Poll requires a title and at least two options.' });
    }

    const newPoll: Poll = {
      id: 'poll-' + Date.now(),
      title: title.trim(),
      description: (description || '').trim(),
      category: (category || 'General').trim(),
      order: db.polls.length + 1,
      active: true,
      createdAt: new Date().toISOString(),
      options: options.map((opt: { text: string; description?: string; badge?: string; imageUrl?: string }, idx: number) => ({
        id: 'opt-' + Date.now() + '-' + (idx + 1),
        text: (opt.text || '').trim(),
        description: (opt.description || '').trim(),
        badge: (opt.badge || '').trim(),
        imageUrl: (opt.imageUrl || '').trim(),
      })),
    };

    db.polls.push(newPoll);
    saveDatabase(db);
    persistPollToFirestore(newPoll).catch((e) => console.error('Firestore poll save error:', e));
    res.json({ success: true, poll: newPoll });
  });

  // Update existing poll
  app.put('/api/admin/polls/:id', (req, res) => {
    const { id } = req.params;
    const pollIndex = db.polls.findIndex((p) => p.id === id);
    if (pollIndex === -1) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    const { title, description, category, options, active, order } = req.body;
    const current = db.polls[pollIndex];

    const updatedPoll: Poll = {
      ...current,
      title: title !== undefined ? title.trim() : current.title,
      description: description !== undefined ? description.trim() : current.description,
      category: category !== undefined ? category.trim() : current.category,
      active: active !== undefined ? Boolean(active) : current.active,
      order: order !== undefined ? Number(order) : current.order,
      options: Array.isArray(options)
        ? options.map((opt: any, idx: number) => ({
            id: opt.id || 'opt-' + Date.now() + '-' + (idx + 1),
            text: (opt.text || '').trim(),
            description: (opt.description || '').trim(),
            badge: (opt.badge || '').trim(),
            imageUrl: (opt.imageUrl || '').trim(),
          }))
        : current.options,
    };

    db.polls[pollIndex] = updatedPoll;
    saveDatabase(db);
    persistPollToFirestore(updatedPoll).catch((e) => console.error('Firestore poll update error:', e));
    res.json({ success: true, poll: db.polls[pollIndex] });
  });

  // Delete poll
  app.delete('/api/admin/polls/:id', (req, res) => {
    const { id } = req.params;
    db.polls = db.polls.filter((p) => p.id !== id);
    saveDatabase(db);
    removePollFromFirestore(id).catch((e) => console.error('Firestore poll delete error:', e));
    res.json({ success: true });
  });

  // Update config (e.g. deadline or titles)
  app.post('/api/admin/config', (req, res) => {
    const { deadlinePST, deadlineLabel, eventTitle, eventSubtitle } = req.body;
    db.config = {
      ...db.config,
      ...(deadlinePST ? { deadlinePST } : {}),
      ...(deadlineLabel ? { deadlineLabel } : {}),
      ...(eventTitle ? { eventTitle } : {}),
      ...(eventSubtitle ? { eventSubtitle } : {}),
    };
    saveDatabase(db);
    persistConfigToFirestore(db.config).catch((e) => console.error('Firestore config update error:', e));
    res.json({ success: true, config: db.config });
  });

  // Reset/Clear all votes
  app.post('/api/admin/clear-votes', (req, res) => {
    const voterIds = db.voters.map((v) => v.id);
    db.voters = [];
    saveDatabase(db);
    clearAllVotersFromFirestore(voterIds).catch((e) => console.error('Firestore clear votes error:', e));
    res.json({ success: true, message: 'All votes have been cleared.' });
  });

  // Export CSV: Individual Voter Responses
  app.get('/api/admin/export-csv', (req, res) => {
    // UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const polls = db.polls;

    let headerRow: string[];
    const isSinglePoll = polls.length === 1;

    if (isSinglePoll) {
      headerRow = [
        'Voter Name',
        'Submission Timestamp (PST / UTC+8)',
        'Selected Giveaway Option',
        'Option Tag/Badge',
      ];
    } else {
      headerRow = [
        'Voter Name',
        'Submission Timestamp (PST / UTC+8)',
        ...polls.map((p) => p.title),
      ];
    }

    const rows: string[] = [headerRow.map(escapeCsvField).join(',')];

    db.voters.forEach((v) => {
      let pstDateFormatted = '';
      try {
        const dateObj = new Date(v.timestamp);
        pstDateFormatted =
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }).format(dateObj) + ' PST';
      } catch (e) {
        pstDateFormatted = v.timestamp;
      }

      if (isSinglePoll) {
        const singlePoll = polls[0];
        const selectedOptId = v.votes[singlePoll.id];
        const opt = singlePoll.options.find((o) => o.id === selectedOptId);
        const optText = opt ? opt.text : selectedOptId || 'No selection';
        const optBadge = opt?.badge || '';
        const row = [v.voterName, pstDateFormatted, optText, optBadge];
        rows.push(row.map(escapeCsvField).join(','));
      } else {
        const pollAnswers = polls.map((p) => {
          const selectedOptId = v.votes[p.id];
          if (!selectedOptId) return 'No vote recorded';
          const opt = p.options.find((o) => o.id === selectedOptId);
          return opt ? opt.text : selectedOptId;
        });
        const row = [v.voterName, pstDateFormatted, ...pollAnswers];
        rows.push(row.map(escapeCsvField).join(','));
      }
    });

    const csvContent = BOM + rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="christmas-giveaway-entries-${Date.now()}.csv"`);
    res.send(csvContent);
  });

  // Export CSV: Overall Tallies
  app.get('/api/admin/export-summary-csv', (req, res) => {
    const BOM = '\uFEFF';
    const tallies = calculateTallies(db.polls, db.voters);

    const headerRow = ['Poll Title', 'Poll Category', 'Option Text', 'Tag/Badge', 'Vote Count', 'Percentage (%)', 'Total Poll Votes'];
    const rows: string[] = [headerRow.map(escapeCsvField).join(',')];

    tallies.forEach((tally) => {
      const poll = db.polls.find((p) => p.id === tally.pollId);
      const category = poll?.category || 'General';

      tally.options.forEach((opt) => {
        const row = [
          tally.pollTitle,
          category,
          opt.text,
          opt.badge || '',
          opt.count,
          `${opt.percentage}%`,
          tally.totalVotes,
        ];
        rows.push(row.map(escapeCsvField).join(','));
      });
    });

    const csvContent = BOM + rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="christmas-giveaway-tallies-summary-${Date.now()}.csv"`);
    res.send(csvContent);
  });

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
