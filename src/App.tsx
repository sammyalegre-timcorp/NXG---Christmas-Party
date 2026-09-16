/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Gift,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Send,
  Sparkles,
  Tag,
  User,
  X,
} from 'lucide-react';
import { Snowfall } from './components/Snowfall.tsx';
import { ChristmasCountdown } from './components/ChristmasCountdown.tsx';
import { FestiveHeader } from './components/FestiveHeader.tsx';
import { VoterConfirmedView } from './components/VoterConfirmedView.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import type { AppConfig, Poll, PublicPollsResponse } from './types.ts';

export default function App() {
  // Routing: check if user accessed "/admin"
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Polls & Config data
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Single-tile form state
  const [voterName, setVoterName] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Already voted state
  const [hasVoted, setHasVoted] = useState(false);
  const [confirmedVoterName, setConfirmedVoterName] = useState('');
  const [confirmedTimestamp, setConfirmedTimestamp] = useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Handle URL path changes (e.g. user manually adds /admin)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Fetch poll data on mount
  const fetchPolls = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/public-polls');
      if (!res.ok) throw new Error('Unable to load giveaway poll');
      const data: PublicPollsResponse = await res.json();
      setConfig(data.config);
      // Grab active poll (the single giveaway poll tile)
      if (data.polls && data.polls.length > 0) {
        setPoll(data.polls[0]);
      }

      // Check if user previously voted on this device
      const storedName = localStorage.getItem('christmas_giveaway_voter_name');
      const storedTimestamp = localStorage.getItem('christmas_giveaway_timestamp');

      if (storedName) {
        try {
          const checkRes = await fetch(`/api/check-voter?name=${encodeURIComponent(storedName)}`);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.hasVoted) {
              setHasVoted(true);
              setConfirmedVoterName(checkData.voterName || storedName);
              setConfirmedTimestamp(checkData.timestamp || storedTimestamp || '');
            } else {
              localStorage.removeItem('christmas_giveaway_voter_name');
              localStorage.removeItem('christmas_giveaway_timestamp');
            }
          }
        } catch (e) {
          setHasVoted(true);
          setConfirmedVoterName(storedName);
          setConfirmedTimestamp(storedTimestamp || '');
        }
      }
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || 'Failed to load poll.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const triggerFestiveConfetti = () => {
    try {
      const end = Date.now() + 2.5 * 1000;
      const colors = ['#f59e0b', '#dc2626', '#10b981', '#ffffff', '#fbbf24'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
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

  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = voterName.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError('Please enter your full name (at least 2 characters) before submitting.');
      return;
    }

    if (!selectedOptionId) {
      setFormError('Please select one of the Christmas giveaway options.');
      return;
    }

    if (!poll) {
      setFormError('Poll data is not loaded.');
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
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterName: cleanName,
          votes: { [poll.id]: selectedOptionId },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit vote');
      }

      // Save to localStorage
      localStorage.setItem('christmas_giveaway_voter_name', cleanName);
      localStorage.setItem('christmas_giveaway_timestamp', json.timestamp || new Date().toISOString());

      // Show confirmed view
      setConfirmedVoterName(cleanName);
      setConfirmedTimestamp(json.timestamp || new Date().toISOString());
      setHasVoted(true);

      // Festive celebration effects
      triggerFestiveConfetti();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while submitting your vote.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset to allow another person on a shared computer
  const handleVoteAgainAsDifferent = () => {
    localStorage.removeItem('christmas_giveaway_voter_name');
    localStorage.removeItem('christmas_giveaway_timestamp');
    setHasVoted(false);
    setVoterName('');
    setSelectedOptionId('');
    setFormError(null);
  };

  // Check if current URL route is /admin
  const isAdminRoute = currentPath.toLowerCase().startsWith('/admin');

  if (isAdminRoute) {
    return (
      <AdminDashboard
        onNavigateToMain={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
          fetchPolls();
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a1811] text-[#f4f7f5]">
      {/* Falling snowflakes background */}
      <Snowfall />

      {/* Main Container */}
      <div className="relative z-20 mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        {/* Festive Header */}
        <FestiveHeader
          eventTitle={config?.eventTitle || 'Christmas Giveaway Poll'}
          eventSubtitle={
            config?.eventSubtitle ||
            'Vote for your preferred Christmas giveaway item. Choose one option below!'
          }
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

        {/* Content Area: Single Tile Poll OR Confirmed Screen */}
        <div className="mt-8">
          {loading ? (
            <div className="rounded-2xl border border-emerald-800/40 bg-[#10241b] p-12 text-center shadow-xl">
              <Gift className="mx-auto h-10 w-10 text-amber-400 animate-bounce" />
              <p className="mt-3 font-serif text-lg font-bold text-white">
                Loading Giveaway Options...
              </p>
              <p className="mt-1 text-xs text-emerald-300/80">
                Fetching holiday ballot &amp; countdown status
              </p>
            </div>
          ) : fetchError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/60 p-8 text-center text-red-200 shadow-xl">
              <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
              <h3 className="mt-2 text-base font-bold text-white">
                Unable to Load Poll
              </h3>
              <p className="mt-1 text-xs text-red-300">{fetchError}</p>
              <button
                onClick={fetchPolls}
                className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                Retry
              </button>
            </div>
          ) : hasVoted ? (
            /* Results remain confidential - only admin can see */
            <VoterConfirmedView
              voterName={confirmedVoterName}
              votedAt={confirmedTimestamp}
              onVoteAgainAsDifferentPerson={handleVoteAgainAsDifferent}
            />
          ) : poll ? (
            /* THE SINGLE TILE WITH MULTIPLE OPTIONS */
            <form
              onSubmit={handleSubmitVote}
              className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-b from-[#142e22] via-[#0f2319] to-[#0a1711] p-6 shadow-2xl sm:p-8"
            >
              {/* Top ribbon border */}
              <div className="absolute top-0 left-0 h-2 w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-500" />

              {/* Tile Header */}
              <div className="border-b border-emerald-800/60 pb-5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Gift className="h-3.5 w-3.5 text-red-400" />
                    <span>Official Giveaway Ballot</span>
                  </span>
                  <span className="text-xs text-emerald-300/80">• One Vote Per Person</span>
                </div>

                <h2 className="mt-2 font-serif text-2xl font-bold text-white sm:text-3xl">
                  {poll.title}
                </h2>
                {poll.description && (
                  <p className="mt-1 text-xs sm:text-sm text-slate-300/85">
                    {poll.description}
                  </p>
                )}
              </div>

              {/* Section 1: Voter Full Name */}
              <div className="mt-6 rounded-2xl border border-emerald-800/50 bg-[#0d1d16]/90 p-4 sm:p-5">
                <label
                  htmlFor="voter-name-field"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300"
                >
                  <User className="h-3.5 w-3.5 text-amber-400" />
                  <span>Your Full Name *</span>
                </label>
                <p className="mt-1 text-xs text-slate-400">
                  Required to verify your single vote entry. Each person can only vote once.
                </p>

                <div className="relative mt-2.5">
                  <input
                    id="voter-name-field"
                    type="text"
                    required
                    value={voterName}
                    onChange={(e) => {
                      setVoterName(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="e.g. Maria Santos or Juan Dela Cruz"
                    className="w-full rounded-xl border border-emerald-700/60 bg-[#07130e] px-4 py-3 pl-11 text-sm sm:text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                  />
                  <Gift className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-amber-400" />
                </div>
              </div>

              {/* Section 2: Multiple Options inside this single tile */}
              <div className="mt-6">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="font-serif text-base font-bold text-white sm:text-lg">
                    Select Your Giveaway Choice
                  </h3>
                  <span className="text-xs text-amber-300 font-semibold">
                    {selectedOptionId ? '1 Selected' : 'Choose 1'}
                  </span>
                </div>

                <div role="radiogroup" className="space-y-2.5">
                  {poll.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                      <label
                        key={option.id}
                        htmlFor={`opt-${option.id}`}
                        className={`group relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition-all duration-200 ${
                          isSelected
                            ? 'border-amber-400 bg-gradient-to-r from-[#1c3c2e] to-[#254938] shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50'
                            : 'border-emerald-800/50 bg-[#0d1d16]/90 hover:border-emerald-600 hover:bg-[#13291f]'
                        }`}
                      >
                        <input
                          type="radio"
                          id={`opt-${option.id}`}
                          name="giveaway-option"
                          value={option.id}
                          checked={isSelected}
                          onChange={() => {
                            setSelectedOptionId(option.id);
                            setFormError(null);
                          }}
                          className="sr-only"
                        />

                        {/* Custom Radio Button */}
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                            isSelected
                              ? 'border-amber-400 bg-amber-400 text-slate-950'
                              : 'border-emerald-600/70 bg-emerald-950/60 group-hover:border-amber-400/70'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>

                        {/* Option Photo Thumbnail (if provided) */}
                        {option.imageUrl && (
                          <div className="group/img relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl border border-emerald-700/60 bg-[#07130e] shadow-md">
                            <img
                              src={option.imageUrl}
                              alt={option.text}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setPreviewImage({ url: option.imageUrl!, title: option.text });
                              }}
                              title="Click to zoom photo"
                              className="absolute bottom-1 right-1 flex items-center justify-center rounded-md bg-black/75 p-1 text-white opacity-80 backdrop-blur-xs transition-all hover:bg-amber-400 hover:text-slate-950 group-hover/img:opacity-100"
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Option Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm sm:text-base font-bold transition-colors ${
                                isSelected ? 'text-amber-200' : 'text-slate-100 group-hover:text-amber-100'
                              }`}
                            >
                              {option.text}
                            </span>

                            {option.badge && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-colors ${
                                  isSelected
                                    ? 'bg-amber-400/25 text-amber-300 border border-amber-400/50'
                                    : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                                }`}
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {option.badge}
                              </span>
                            )}
                          </div>

                          {option.description && (
                            <p className="mt-1 text-xs text-slate-300/80 leading-relaxed">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Error Notice */}
              {formError && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/60 bg-red-950/80 p-3.5 text-xs text-red-200 shadow-md">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit Button inside the tile */}
              <div className="mt-8 border-t border-emerald-800/60 pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-red-600 via-red-700 to-amber-600 px-8 py-4 text-base sm:text-lg font-bold text-white shadow-xl shadow-red-950/60 transition-all hover:brightness-110 active:scale-[0.99] ${
                    submitting ? 'cursor-wait opacity-75' : ''
                  }`}
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Submitting Vote...</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-amber-300 group-hover:scale-110 transition-transform" />
                      <span>Submit Christmas Vote 🎁</span>
                      <Send className="h-4 w-4 text-white group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Single Vote Enforced</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-300/90">
                    <Lock className="h-3 w-3 text-amber-400" />
                    <span>Results Confidential</span>
                  </span>
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-emerald-800/40 bg-[#10241b] p-8 text-center text-slate-300">
              No active giveaway poll found.
            </div>
          )}
        </div>

        {/* Festive Footer (STRICTLY NO ADMIN LINK) */}
        <footer className="mt-16 text-center text-xs text-emerald-300/60">
          <p className="flex items-center justify-center gap-1.5">
            <span>🎄</span>
            <span>Christmas Giveaway Poll</span>
            <span>•</span>
            <span>Wishing You a Joyful Holiday Season!</span>
            <span>⭐</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400/60">
            Countdown target: September 18, 6:00 PM PST • Committee Secret Ballot
          </p>
        </footer>
      </div>

      {/* Lightbox / Image Preview Modal */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-400/50 bg-[#0c1813] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-emerald-800/70 bg-[#10241a] px-5 py-3.5">
              <span className="font-serif text-sm sm:text-base font-bold text-white truncate pr-4">
                {previewImage.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
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
