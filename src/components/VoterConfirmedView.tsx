import React from 'react';
import { CheckCircle2, Clock, Lock, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import type { Poll } from '../types.ts';
import { NexusguardLogo } from './NexusguardLogo.tsx';

interface VoterConfirmedViewProps {
  voterName: string;
  votedAt?: string;
  polls?: Poll[];
  votes?: Record<string, string>;
  onVoteAgainAsDifferentPerson?: () => void;
}

export const VoterConfirmedView: React.FC<VoterConfirmedViewProps> = ({
  voterName,
  votedAt,
  polls = [],
  votes = {},
  onVoteAgainAsDifferentPerson,
}) => {
  const formattedTime = votedAt
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date(votedAt)) + ' PST (Philippine Standard Time)'
    : 'Recorded securely';

  return (
    <div
      id="vote-confirmed-card"
      className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[#EB5624]/40 bg-gradient-to-b from-[#182028] via-[#12171d] to-[#0c1014] p-6 text-center shadow-2xl sm:p-10"
    >
      {/* Nexusguard orange glow ambient effects */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-56 w-56 rounded-full bg-[#EB5624]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-[#EB5624]/20 blur-3xl" />

      {/* Top brand accent ribbon */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#EB5624] via-[#FF7A45] to-[#EB5624]" />

      {/* Official Nexusguard brand header */}
      <div className="mb-6 flex justify-center">
        <NexusguardLogo size="lg" variant="badge" />
      </div>

      {/* Success Badge */}
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#EB5624]/60 bg-gradient-to-tr from-[#EB5624]/20 to-[#1e252d] shadow-inner shadow-[#EB5624]/30">
        <Trophy className="h-10 w-10 text-[#EB5624] animate-bounce" />
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 stroke-[3]" />
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#EB5624]/50 bg-[#EB5624]/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#FF7A45]">
        <Sparkles className="h-3.5 w-3.5 text-[#EB5624]" />
        Nexusguard Official Ballot Sealed
      </div>

      <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white">
        Thank You, <span className="text-[#EB5624]">{voterName}</span>!
      </h2>

      <p className="mt-2 text-sm text-slate-300 sm:text-base max-w-lg mx-auto">
        Your choices have been securely encrypted and submitted to the Nexusguard Christmas Ballot box.
      </p>

      {/* Summary of Chosen Poll Options */}
      {polls.length > 0 && (
        <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-slate-700/60 bg-[#161c24]/90 p-4 text-left shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Your Submitted Selections</span>
            <span className="text-[#EB5624]">{Object.keys(votes).length} of {polls.length} Answered</span>
          </h3>

          <div className="space-y-3">
            {polls.map((poll, idx) => {
              const selectedOptionId = votes[poll.id];
              const option = poll.options.find((o) => o.id === selectedOptionId);

              return (
                <div
                  key={poll.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-[#0f141a] p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {option?.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt={option.text}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-700"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-400 truncate">
                        Poll #{idx + 1}: {poll.title}
                      </div>
                      <div className="text-sm font-bold text-white truncate">
                        {option ? option.text : <span className="text-amber-400">No selection</span>}
                      </div>
                    </div>
                  </div>

                  {option?.badge && (
                    <span className="shrink-0 rounded-md bg-[#EB5624]/20 border border-[#EB5624]/40 px-2 py-0.5 text-[10px] font-bold text-[#FF7A45]">
                      {option.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voter details badge */}
      <div className="mx-auto mt-5 max-w-lg rounded-2xl border border-slate-700/60 bg-[#121820]/90 p-4 text-left shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <ShieldCheck className="h-4 w-4 text-[#EB5624]" />
            Voter Identity
          </span>
          <span className="font-bold text-white">{voterName}</span>
        </div>

        <div className="flex items-center justify-between pt-2.5 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            <Clock className="h-4 w-4 text-[#EB5624]" />
            Official Timestamp
          </span>
          <span className="text-right text-slate-200">{formattedTime}</span>
        </div>
      </div>

      {/* Secrecy notice */}
      <div className="mx-auto mt-5 flex max-w-lg items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5 text-left text-xs text-amber-200/90 sm:text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-300">Confidential Ballot:</strong> Poll tallies remain secret to maintain the holiday excitement and will be officially unveiled during the Nexusguard Christmas Celebration!
        </p>
      </div>

      {/* Shared device switch option */}
      {onVoteAgainAsDifferentPerson && (
        <div className="mt-8 border-t border-slate-800 pt-5">
          <button
            type="button"
            onClick={onVoteAgainAsDifferentPerson}
            className="text-xs text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-[#EB5624] transition-colors cursor-pointer"
          >
            Using a shared office computer? Cast vote as a different team member
          </button>
        </div>
      )}
    </div>
  );
};
