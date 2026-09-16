import React from 'react';
import { Gift, Lock, Sparkles, Star } from 'lucide-react';

interface FestiveHeaderProps {
  eventTitle?: string;
  eventSubtitle?: string;
}

export const FestiveHeader: React.FC<FestiveHeaderProps> = ({
  eventTitle = 'Grand Christmas Giveaway Poll',
  eventSubtitle = 'Help our committee select the most exciting holiday gifts and Noche Buena treats for this year!',
}) => {
  return (
    <header className="relative overflow-hidden pt-8 pb-6 text-center">
      {/* Subtle festive background sparkles */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-44 w-96 rounded-full bg-red-600/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/4 top-8 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="pointer-events-none absolute right-1/4 top-8 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />

      {/* Garland / Festivity badge */}
      <div className="relative inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-red-950/80 via-[#132c20]/90 to-red-950/80 px-4 py-1.5 shadow-lg shadow-black/40 backdrop-blur-md">
        <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
        <span className="font-serif text-xs font-semibold tracking-wider text-amber-200 uppercase">
          Holiday Celebration • Secret Ballot
        </span>
        <Gift className="h-3.5 w-3.5 text-red-400" />
      </div>

      {/* Main Title */}
      <h1 className="relative mt-4 font-serif text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-md">
        <span className="bg-gradient-to-b from-white via-slate-100 to-amber-100 bg-clip-text text-transparent">
          {eventTitle}
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mx-auto mt-3 max-w-2xl px-4 text-sm text-emerald-100/85 sm:text-base leading-relaxed">
        {eventSubtitle}
      </p>

      {/* Guidelines pills */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 px-4 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/50 bg-[#0f251c]/90 px-3 py-1 text-emerald-200 shadow-sm">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          One Vote Per Person
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-[#16271c]/90 px-3 py-1 text-amber-200 shadow-sm">
          <Lock className="h-3 w-3 text-amber-400" />
          Confidential Results (Sealed Ballot)
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-[#241316]/90 px-3 py-1 text-red-200 shadow-sm">
          <Gift className="h-3 w-3 text-red-400" />
          Revealed at Christmas Party
        </span>
      </div>
    </header>
  );
};
