/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Gift,
  HelpCircle,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { ChristmasCountdown } from './components/ChristmasCountdown.tsx';
import { FestiveHeader } from './components/FestiveHeader.tsx';
import { VoterConfirmedView } from './components/VoterConfirmedView.tsx';
import { NexusguardLogo } from './components/NexusguardLogo.tsx';
import type { AppConfig, Poll, PublicPollsResponse } from './types.ts';
import { fetchAdminDataDirect, directSubmitVote, directCheckVoter } from './clientDirectFirestore.ts';

// Code-split AdminDashboard so regular voters on the main page do not download 1700+ lines of admin logic
const AdminDashboard = React.lazy(() =>
  import('./components/AdminDashboard.tsx').then((m) => ({ default: m.AdminDashboard }))
);

function checkIsAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path.startsWith('/admin') ||
    hash.includes('admin') ||
    search.includes('admin') ||
    new URLSearchParams(window.location.search).get('view') === 'admin'
  );
}

export default function App() {
  // Routing: check if committee accessed "/admin"
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminRoute);

  // Polls & Config data with instant cached hydration for immediate zero-delay first-paint
  const [config, setConfig] = useState<AppConfig | null>(() => {
    try {
      const cached = localStorage.getItem('nexusguard_cached_config');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [polls, setPolls] = useState<Poll[]>(() => {
    try {
      const cached = localStorage.getItem('nexusguard_cached_polls');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('nexusguard_cached_polls');
      return !(cached && JSON.parse(cached).length > 0);
    } catch {
      return true;
    }
  });
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Multi-poll vote state: pollId -> optionId
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});
  const [voterName, setVoterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Single-vote real-time verification state
  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameAlreadyVotedInfo, setNameAlreadyVotedInfo] = useState<{
    alreadyVoted: boolean;
    voterName?: string;
    timestamp?: string;
    votes?: Record<string, string>;
  }>({ alreadyVoted: false });

  // Confirmed vote state
  const [hasVoted, setHasVoted] = useState(false);
  const [confirmedVoterName, setConfirmedVoterName] = useState('');
  const [confirmedTimestamp, setConfirmedTimestamp] = useState('');
  const [confirmedVotes, setConfirmedVotes] = useState<Record<string, string>>({});

  // Lightbox / Image Zoom modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Active polls only
  const activePolls = useMemo(() => {
    return polls.filter((p) => p.active).sort((a, b) => (a.order || 1) - (b.order || 1));
  }, [polls]);

  // Number of answered polls
  const answeredCount = useMemo(() => {
    return activePolls.filter((p) => !!selectedVotes[p.id]).length;
  }, [activePolls, selectedVotes]);

  const allPollsAnswered = activePolls.length > 0 && answeredCount === activePolls.length;
  const isFormComplete = voterName.trim().length >= 2 && allPollsAnswered && !nameAlreadyVotedInfo.alreadyVoted;

  // Handle URL path & hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Fetch all polls data on mount
  const fetchPolls = async () => {
    try {
      setFetchError(null);
      let data: PublicPollsResponse | null = null;

      try {
        const res = await fetch('/api/public-polls');
        if (res.ok) {
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch (e) {}
        }
      } catch (e) {
        console.warn('API fetch /api/public-polls failed, falling back to direct Firestore:', e);
      }

      // If backend API not reachable, query Firestore directly
      if (!data || !data.polls || data.polls.length === 0) {
        const directData = await fetchAdminDataDirect();
        data = {
          config: directData.config,
          polls: directData.polls,
        };
      }

      if (data) {
        if (data.config) {
          setConfig(data.config);
          try {
            localStorage.setItem('nexusguard_cached_config', JSON.stringify(data.config));
          } catch (e) {}
        }
        if (data.polls && Array.isArray(data.polls)) {
          setPolls(data.polls);
          try {
            localStorage.setItem('nexusguard_cached_polls', JSON.stringify(data.polls));
          } catch (e) {}
        }
      }

      // Immediately unblock loading indicator as soon as polls are available
      setLoading(false);

      // Check if user previously voted on this device (runs in background without holding up polls display)
      const storedName = localStorage.getItem('nexusguard_voter_name') || localStorage.getItem('christmas_giveaway_voter_name');
      const storedTimestamp = localStorage.getItem('nexusguard_voter_timestamp') || localStorage.getItem('christmas_giveaway_timestamp');
      const storedVotesRaw = localStorage.getItem('nexusguard_voter_votes');

      if (storedName) {
        let storedVotes: Record<string, string> = {};
        if (storedVotesRaw) {
          try {
            storedVotes = JSON.parse(storedVotesRaw);
          } catch (e) {}
        }

        try {
          const checkRes = await fetch(`/api/check-voter?name=${encodeURIComponent(storedName)}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.hasVoted) {
              setHasVoted(true);
              setConfirmedVoterName(checkData.voterName || storedName);
              setConfirmedTimestamp(checkData.timestamp || storedTimestamp || '');
              if (checkData.votes) setConfirmedVotes(checkData.votes);
              else setConfirmedVotes(storedVotes);
            } else {
              localStorage.removeItem('nexusguard_voter_name');
              localStorage.removeItem('nexusguard_voter_timestamp');
              localStorage.removeItem('nexusguard_voter_votes');
            }
          }
        } catch (e) {
          setHasVoted(true);
          setConfirmedVoterName(storedName);
          setConfirmedTimestamp(storedTimestamp || '');
          setConfirmedVotes(storedVotes);
        }
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'Failed to load polls.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  // Real-time verification: check if entered name has already voted so they can only vote once
  useEffect(() => {
    const trimmed = voterName.trim();
    if (trimmed.length < 2) {
      setNameAlreadyVotedInfo({ alreadyVoted: false });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setNameCheckLoading(true);
        let checkData: {
          hasVoted: boolean;
          voterName?: string;
          timestamp?: string;
          votes?: Record<string, string>;
        } | null = null;

        try {
          const res = await fetch(`/api/check-voter?name=${encodeURIComponent(trimmed)}`);
          if (res.ok) {
            checkData = await res.json();
          }
        } catch (e) {}

        if (!checkData) {
          checkData = await directCheckVoter(trimmed);
        }

        if (checkData && checkData.hasVoted) {
          setNameAlreadyVotedInfo({
            alreadyVoted: true,
            voterName: checkData.voterName || trimmed,
            timestamp: checkData.timestamp,
            votes: checkData.votes,
          });
        } else {
          setNameAlreadyVotedInfo({ alreadyVoted: false });
        }
      } catch (e) {
        // ignore background check error
      } finally {
        setNameCheckLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [voterName]);

  const triggerFestiveConfetti = () => {
    try {
      const end = Date.now() + 2.5 * 1000;
      const colors = ['#EB5624', '#FF7A45', '#f59e0b', '#ffffff', '#10b981'];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    } catch (e) {
      // safe fallback
    }
  };

  const handleSelectOption = (pollId: string, optionId: string) => {
    setSelectedVotes((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
    setFormError(null);
  };

  const scrollToPoll = (pollId: string) => {
    const el = document.getElementById(`poll-card-${pollId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = voterName.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters) before submitting your ballot.');
      return;
    }

    if (nameAlreadyVotedInfo.alreadyVoted) {
      setFormError(
        `A vote has already been submitted under the name "${cleanName}". Each Nexusguard team member may only vote once.`
      );
      return;
    }

    if (activePolls.length === 0) {
      setFormError('No active polls are currently open.');
      return;
    }

    // Ensure all active polls have an option selected
    const missingPolls = activePolls.filter((p) => !selectedVotes[p.id]);
    if (missingPolls.length > 0) {
      setFormError(
        `Please select an option for "${missingPolls[0].title}". You have completed ${answeredCount} of ${activePolls.length} polls.`
      );
      scrollToPoll(missingPolls[0].id);
      return;
    }

    // Check deadline on client side
    if (config?.deadlinePST) {
      const deadline = new Date(config.deadlinePST);
      if (Date.now() > deadline.getTime()) {
        setFormError('Voting has concluded. The countdown deadline has passed.');
        return;
      }
    }

    try {
      setSubmitting(true);
      let voteConfirmed = false;
      let timestamp = new Date().toISOString();

      try {
        const res = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voterName: cleanName,
            votes: selectedVotes,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          voteConfirmed = true;
          if (json.timestamp) timestamp = json.timestamp;
        } else {
          const errJson = await res.json().catch(() => null);
          if (errJson?.error) {
            throw new Error(errJson.error);
          }
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('fetch')) {
          throw apiErr;
        }
      }

      // If backend API route was not reachable, write directly to Firestore
      if (!voteConfirmed) {
        const directRes = await directSubmitVote(
          cleanName,
          selectedVotes,
          config?.deadlinePST
        );
        timestamp = directRes.timestamp;
      }

      // Save to localStorage
      localStorage.setItem('nexusguard_voter_name', cleanName);
      localStorage.setItem('nexusguard_voter_timestamp', timestamp);
      localStorage.setItem('nexusguard_voter_votes', JSON.stringify(selectedVotes));

      // Show confirmed view
      setConfirmedVoterName(cleanName);
      setConfirmedTimestamp(timestamp);
      setConfirmedVotes({ ...selectedVotes });
      setHasVoted(true);

      // Festive celebration effects
      triggerFestiveConfetti();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while submitting your ballot.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset to allow another person on a shared computer
  const handleVoteAgainAsDifferent = () => {
    localStorage.removeItem('nexusguard_voter_name');
    localStorage.removeItem('nexusguard_voter_timestamp');
    localStorage.removeItem('nexusguard_voter_votes');
    setHasVoted(false);
    setVoterName('');
    setSelectedVotes({});
    setNameAlreadyVotedInfo({ alreadyVoted: false });
    setFormError(null);
  };

  if (isAdminRoute) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#0a1511] flex items-center justify-center text-slate-300">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-[#EB5624] border-t-transparent animate-spin" />
              <p className="text-sm font-semibold text-white">Loading Admin Portal...</p>
            </div>
          </div>
        }
      >
        <AdminDashboard
          onNavigateToMain={() => {
            window.history.pushState({}, '', '/');
            setIsAdminRoute(false);
            fetchPolls();
          }}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0c1015] text-[#f4f7f5] selection:bg-[#EB5624] selection:text-white">
      {/* Main Container */}
      <div className="relative z-20 mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        {/* Top Header with prominent Nexusguard Logo badge */}
        <FestiveHeader
          eventTitle={config?.eventTitle || 'Nexusguard Christmas Celebration & Year-End Polls'}
          eventSubtitle={
            config?.eventSubtitle ||
            'Vote for your preferred Christmas giveaway item and celebration theme. Cast your confidential ballot below!'
          }
          companyName={config?.companyName || 'Nexusguard Holiday Committee'}
        />

        {/* Countdown Banner */}
        <div className="mt-4">
          <ChristmasCountdown
            deadlineISO={config?.deadlinePST || '2026-09-18T18:00:00+08:00'}
            deadlineLabel={
              config?.deadlineLabel ||
              'September 18, 6:00 PM PST (Philippine Standard Time)'
            }
          />
        </div>

        {/* Content Area */}
        <div className="mt-8">
          {loading ? (
            <div className="rounded-2xl border border-slate-700/60 bg-[#131920] p-12 text-center shadow-xl">
              <Gift className="mx-auto h-10 w-10 text-[#EB5624] animate-bounce" />
              <p className="mt-3 text-lg font-black text-white">
                Loading Nexusguard Polls...
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Synchronizing giveaway options and celebration themes
              </p>
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/60 p-8 text-center text-red-200 shadow-xl">
              <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
              <h3 className="mt-2 text-base font-bold text-white">
                Unable to Load Polls
              </h3>
              <p className="mt-1 text-xs text-red-300">{fetchError}</p>
              <button
                type="button"
                onClick={fetchPolls}
                className="mt-4 rounded-xl bg-[#EB5624] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF7A45] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : hasVoted ? (
            /* Results remain confidential - only admin can view tallies */
            <VoterConfirmedView
              voterName={confirmedVoterName}
              votedAt={confirmedTimestamp}
              polls={activePolls}
              votes={confirmedVotes}
              onVoteAgainAsDifferentPerson={handleVoteAgainAsDifferent}
            />
          ) : activePolls.length > 0 ? (
            /* MULTIPLE POLLS VOTING FLOW */
            <form onSubmit={handleSubmitVote} className="space-y-8">
              {/* STICKY BALLOT PROGRESS & VOTER STATUS BAR */}
              <div className="sticky top-4 z-30 rounded-2xl border border-[#EB5624]/40 bg-[#11171f]/95 p-4 shadow-2xl backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <NexusguardLogo size="sm" variant="badge" className="py-1 px-3 shadow-none border-none" />
                    <span className="hidden sm:inline text-xs text-slate-400 font-medium">
                      • Official Ballot
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">
                        Progress: <span className="text-[#EB5624]">{answeredCount} of {activePolls.length}</span> Completed
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {voterName.trim().length < 2
                          ? 'Name entry required'
                          : nameAlreadyVotedInfo.alreadyVoted
                          ? '⚠️ Already voted'
                          : allPollsAnswered
                          ? '✓ Ready to Submit'
                          : 'Selections needed'}
                      </div>
                    </div>

                    {/* Progress visual bar */}
                    <div className="h-2.5 w-24 sm:w-36 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-[#EB5624] to-[#FF7A45] transition-all duration-300 rounded-full"
                        style={{
                          width: `${(answeredCount / activePolls.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Poll quick-jump pills */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-wrap gap-2">
                    {activePolls.map((p, idx) => {
                      const isAnswered = !!selectedVotes[p.id];
                      const chosenOption = p.options.find((o) => o.id === selectedVotes[p.id]);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => scrollToPoll(p.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                            isAnswered
                              ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                              : 'border border-slate-700 bg-slate-800/80 text-slate-300 hover:border-[#EB5624]/60 hover:text-white'
                          }`}
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold bg-black/40">
                            {isAnswered ? '✓' : idx + 1}
                          </span>
                          <span className="truncate max-w-[140px] sm:max-w-[180px]">
                            {p.category || p.title}
                          </span>
                          {chosenOption && (
                            <span className="hidden md:inline text-[10px] font-normal text-slate-400 truncate max-w-[90px]">
                              ({chosenOption.text})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Voter Name indicator pill */}
                  <div className="text-xs">
                    {voterName.trim().length >= 2 ? (
                      nameAlreadyVotedInfo.alreadyVoted ? (
                        <span className="inline-flex items-center gap-1 text-red-400 font-bold">
                          <ShieldAlert className="h-3.5 w-3.5" /> Already Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <UserCheck className="h-3.5 w-3.5" /> {voterName.trim()} (1 Vote)
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                        <User className="h-3 w-3" /> Name required below
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 1: VOTER NAME & SINGLE-VOTE AUTHENTICATION */}
              <div className="relative overflow-hidden rounded-3xl border border-[#EB5624]/50 bg-gradient-to-b from-[#19222c] via-[#131921] to-[#0e1318] p-5 sm:p-7 shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#EB5624] via-[#FF7A45] to-amber-500" />

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EB5624]/15 border border-[#EB5624]/40 text-[#EB5624] shadow-md">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#EB5624]/15 border border-[#EB5624]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF7A45]">
                          Required
                        </span>
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                          1 Vote Per Person
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg sm:text-xl font-black text-white">
                        Enter Your Full Name
                      </h2>
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      Strict Single-Vote Verification
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Please enter your full name as registered in the Nexusguard employee directory. Your name ensures that each team member can only submit one confidential ballot.
                </p>

                <div className="mt-4">
                  <div className="relative">
                    <input
                      id="primary-voter-name-input"
                      type="text"
                      required
                      value={voterName}
                      onChange={(e) => {
                        setVoterName(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="e.g. Maria Santos or Juan Dela Cruz"
                      className={`w-full rounded-2xl border bg-[#0a0e13] px-4 py-3.5 pl-12 text-sm sm:text-base text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 ${
                        nameAlreadyVotedInfo.alreadyVoted
                          ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/30'
                          : voterName.trim().length >= 2
                          ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/30'
                          : 'border-slate-700 focus:border-[#EB5624] focus:ring-[#EB5624]/40'
                      }`}
                    />
                    <User className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-[#EB5624]" />

                    {nameCheckLoading && (
                      <div className="absolute right-4 top-4 flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="h-4 w-4 rounded-full border-2 border-[#EB5624] border-t-transparent animate-spin" />
                        <span className="hidden sm:inline">Verifying eligibility...</span>
                      </div>
                    )}
                  </div>

                  {/* Real-time verification feedback */}
                  {nameAlreadyVotedInfo.alreadyVoted ? (
                    <div className="mt-3 rounded-xl border border-red-500/50 bg-red-950/70 p-4 text-xs sm:text-sm text-red-200">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-white">
                            A vote has already been submitted under the name &quot;{nameAlreadyVotedInfo.voterName}&quot;.
                          </p>
                          <p className="mt-1 text-red-300">
                            Each team member may only vote once. If this is you, your ballot has already been securely sealed.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setHasVoted(true);
                              setConfirmedVoterName(nameAlreadyVotedInfo.voterName || voterName.trim());
                              setConfirmedTimestamp(nameAlreadyVotedInfo.timestamp || '');
                              if (nameAlreadyVotedInfo.votes) {
                                setConfirmedVotes(nameAlreadyVotedInfo.votes);
                              }
                            }}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-colors cursor-pointer"
                          >
                            <span>View Your Submitted Ballot</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : voterName.trim().length >= 2 && !nameCheckLoading ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>
                        Verified: &quot;{voterName.trim()}&quot; is eligible to cast 1 official ballot. Select your choices below!
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* RENDER EACH ACTIVE POLL CARD */}
              {activePolls.map((poll, pollIdx) => {
                const selectedOptionId = selectedVotes[poll.id] || '';
                const selectedOption = poll.options.find((o) => o.id === selectedOptionId);

                return (
                  <div
                    key={poll.id}
                    id={`poll-card-${poll.id}`}
                    className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-b from-[#161d25] via-[#12171e] to-[#0d1117] p-5 shadow-2xl transition-all sm:p-7"
                  >
                    {/* Top Accent line */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#EB5624] via-[#FF7A45] to-amber-500" />

                    {/* Poll Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EB5624]/50 bg-[#EB5624]/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-[#FF7A45]">
                            <Sparkles className="h-3 w-3 text-[#EB5624]" />
                            <span>Poll {pollIdx + 1} of {activePolls.length}</span>
                          </span>

                          {poll.category && (
                            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 border border-slate-700">
                              {poll.category}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-2 text-xl sm:text-2xl font-black text-white">
                          {poll.title}
                        </h2>

                        {poll.description && (
                          <p className="mt-1 text-xs sm:text-sm text-slate-300">
                            {poll.description}
                          </p>
                        )}
                      </div>

                      {/* Current Poll Status Badge */}
                      <div className="shrink-0">
                        {selectedOption ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-300 shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Selected: {selectedOption.text}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-300">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                            <span>Select 1 Choice</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options Grid for this Poll */}
                    <div className="mt-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                        {poll.options.map((option) => {
                          const isSelected = selectedOptionId === option.id;

                          return (
                            <div
                              key={option.id}
                              onClick={() => handleSelectOption(poll.id, option.id)}
                              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? 'border-[#EB5624] bg-gradient-to-b from-[#241a17] to-[#1a1514] shadow-xl shadow-[#EB5624]/20 ring-2 ring-[#EB5624]/60'
                                  : 'border-slate-700/70 bg-[#141a21]/90 hover:border-slate-500 hover:bg-[#1a222c]'
                              }`}
                            >
                              {/* Option Image (if present) */}
                              {option.imageUrl && (
                                <div className="relative mb-3.5 h-44 w-full overflow-hidden rounded-xl bg-black/50 border border-slate-700/60">
                                  <img
                                    src={option.imageUrl}
                                    alt={option.text}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                                  {/* Zoom icon button */}
                                  <button
                                    type="button"
                                    title="View enlarged photo"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewImage({ url: option.imageUrl!, title: option.text });
                                    }}
                                    className="absolute bottom-2 right-2 rounded-lg bg-black/70 p-1.5 text-slate-300 hover:text-white hover:bg-black transition-colors"
                                  >
                                    <Maximize2 className="h-4 w-4" />
                                  </button>

                                  {/* Badge on image */}
                                  {option.badge && (
                                    <span className="absolute top-2 left-2 rounded-md bg-[#EB5624]/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                                      {option.badge}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Content Info */}
                              <div className="flex-1">
                                {!option.imageUrl && option.badge && (
                                  <span className="mb-2 inline-block rounded-md bg-[#EB5624]/15 border border-[#EB5624]/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FF7A45]">
                                    {option.badge}
                                  </span>
                                )}

                                <h3 className="text-base font-bold text-white group-hover:text-[#FF7A45] transition-colors leading-snug">
                                  {option.text}
                                </h3>

                                {option.description && (
                                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                                    {option.description}
                                  </p>
                                )}
                              </div>

                              {/* Selection Radio Footer */}
                              <div className="mt-4 flex items-center justify-between border-t border-slate-700/60 pt-3">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                      isSelected
                                        ? 'border-[#EB5624] bg-[#EB5624] text-white shadow-md shadow-[#EB5624]/50'
                                        : 'border-slate-500 group-hover:border-slate-300'
                                    }`}
                                  >
                                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                  </div>
                                  <span className={`text-xs font-bold ${isSelected ? 'text-[#FF7A45]' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                    {isSelected ? 'Selected' : 'Choose This Option'}
                                  </span>
                                </div>

                                {isSelected && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Active Choice
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* SUBMIT ENTRY BUTTON */}
              <div id="submit-entry-container" className="pt-4">
                {formError && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/80 p-3.5 text-xs text-red-200 sm:text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  id="submit-entry-button"
                  disabled={!isFormComplete || submitting}
                  className={`w-full rounded-2xl py-4 px-6 text-center text-base sm:text-lg font-black uppercase tracking-wider transition-all duration-200 shadow-xl ${
                    !isFormComplete || submitting
                      ? 'border border-slate-800 bg-slate-800/80 text-slate-500 cursor-not-allowed opacity-60'
                      : 'border border-[#EB5624] bg-gradient-to-r from-[#EB5624] via-[#f06132] to-[#FF7A45] text-white hover:brightness-110 shadow-[#EB5624]/30 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Submitting Entry...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send className="h-5 w-5" />
                      <span>Submit Entry</span>
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </button>

                {/* Real-time hint when not clickable */}
                <div className="mt-3 text-center">
                  {nameAlreadyVotedInfo.alreadyVoted ? (
                    <p className="text-xs font-bold text-red-400">
                      ⚠️ A vote has already been submitted under &quot;{nameAlreadyVotedInfo.voterName}&quot;. Each person can only vote once.
                    </p>
                  ) : !isFormComplete ? (
                    <p className="text-xs text-slate-400">
                      {voterName.trim().length < 2
                        ? 'Please enter your full name above and complete all polls to enable submission.'
                        : `Please complete all ${activePolls.length} polls above (${answeredCount}/${activePolls.length} selected) to enable submission.`}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> All information and polls completed. Ready to submit!
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Single Vote Verified</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    <span>Encrypted &amp; Confidential</span>
                  </span>
                  <span>•</span>
                  <span className="text-[#EB5624] font-semibold">Nexusguard Holiday Committee</span>
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-slate-700 bg-[#131920] p-8 text-center text-slate-300">
              No active polls are currently published. Please check back shortly.
            </div>
          )}
        </div>

        {/* Clean Footer - "Committee Secret Ballot" link removed as requested */}
        <footer className="mt-16 text-center text-xs text-slate-500">
          <div className="flex justify-center mb-3">
            <NexusguardLogo size="sm" variant="badge" className="py-1 px-3 shadow-none border-none" />
          </div>
          <p className="flex items-center justify-center gap-1.5">
            <span>Nexusguard Cybersecurity</span>
            <span>•</span>
            <span>Annual Year-End Celebration &amp; Christmas Polls</span>
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Voting deadline: September 18, 6:00 PM PST
          </p>
        </footer>
      </div>

      {/* Lightbox / Enlarged Image Preview Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[#EB5624]/50 bg-[#0d1217] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 bg-[#141b24] px-5 py-3.5">
              <span className="text-sm sm:text-base font-bold text-white truncate pr-4">
                {previewImage.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-black/60 p-4">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
