import React from 'react';
import { Award, CheckCircle2, Clock, Gift, Lock, ShieldCheck, Sparkles } from 'lucide-react';

interface VoterConfirmedViewProps {
  voterName: string;
  votedAt?: string;
  onVoteAgainAsDifferentPerson?: () => void;
}

export const VoterConfirmedView: React.FC<VoterConfirmedViewProps> = ({
  voterName,
  votedAt,
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
        hour12: true,
      }).format(new Date(votedAt)) + ' (Philippine Time)'
    : 'Recorded securely';

  return (
    <div
      id="vote-confirmed-card"
      className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-amber-400/50 bg-gradient-to-b from-[#18392a] via-[#10241b] to-[#0a1811] p-6 text-center shadow-2xl sm:p-10"
    >
      {/* Glow background elements */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-red-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />

      {/* Decorative top ribbon */}
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-red-600 via-amber-400 to-emerald-500" />

      {/* Success Stamp & Icon */}
      <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400/60 bg-gradient-to-tr from-amber-500/20 to-red-500/20 shadow-inner shadow-amber-500/30">
        <Gift className="h-10 w-10 text-amber-400 animate-bounce" />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
          <CheckCircle2 className="h-4 w-4 stroke-[3]" />
        </span>
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-1 text-xs font-semibold text-emerald-300">
        <Sparkles className="h-3 w-3 text-amber-300" />
        Official Christmas Ballot Sealed
      </span>

      <h2 className="mt-3 font-serif text-2xl font-bold text-white sm:text-3xl">
        Thank You, <span className="text-amber-300">{voterName}</span>!
      </h2>

      <p className="mt-2 text-sm text-emerald-100/90 sm:text-base">
        Your choices have been successfully recorded for this year&apos;s Christmas Giveaway prizes.
      </p>

      {/* Voter details badge */}
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-700/50 bg-[#0d1d16]/90 p-4 text-left shadow-inner">
        <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2.5 text-xs text-emerald-300">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Voter Name
          </span>
          <span className="font-bold text-white">{voterName}</span>
        </div>

        <div className="flex items-center justify-between pt-2.5 text-xs text-emerald-300">
          <span className="flex items-center gap-1.5 font-medium">
            <Clock className="h-4 w-4 text-emerald-400" />
            Submitted At
          </span>
          <span className="text-right text-slate-200">{formattedTime}</span>
        </div>
      </div>

      {/* Secrecy notice */}
      <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3.5 text-left text-xs text-amber-200/90 sm:text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-300">Results are Confidential:</strong> As per giveaway rules, poll tallies and individual entries remain secret to build excitement and will only be unveiled by the organizing committee during the Christmas party.
        </p>
      </div>

      {/* Shared device switch option */}
      {onVoteAgainAsDifferentPerson && (
        <div className="mt-8 border-t border-emerald-900/60 pt-5">
          <button
            type="button"
            onClick={onVoteAgainAsDifferentPerson}
            className="text-xs text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-amber-300 transition-colors"
          >
            Using a shared device? Cast vote as a different person
          </button>
        </div>
      )}
    </div>
  );
};
