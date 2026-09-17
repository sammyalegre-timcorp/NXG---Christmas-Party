import React from 'react';
import { Lock, Sparkles, Star, Trophy, Users } from 'lucide-react';
import { NexusguardLogo } from './NexusguardLogo.tsx';

interface FestiveHeaderProps {
  eventTitle?: string;
  eventSubtitle?: string;
  companyName?: string;
}

export const FestiveHeader: React.FC<FestiveHeaderProps> = ({
  eventTitle = 'Nexusguard Christmas Celebration & Year-End Polls',
  eventSubtitle = 'Vote for your preferred Christmas giveaway item and party celebration theme. Cast your confidential choices below!',
  companyName = 'Nexusguard Holiday Committee',
}) => {
  return (
    <header className="relative overflow-hidden pt-8 pb-6 text-center">
      {/* Ambient glowing highlights aligned with Nexusguard Orange #EB5624 */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-52 w-[34rem] rounded-full bg-[#EB5624]/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/4 top-10 h-36 w-36 rounded-full bg-[#EB5624]/10 blur-2xl" />
      <div className="pointer-events-none absolute right-1/4 top-10 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl" />

      {/* Official Nexusguard Brand Logo Display */}
      <div className="relative mb-6 flex flex-col items-center justify-center">
        <NexusguardLogo size="xl" variant="badge" />
      </div>

      {/* Garland / Festivity badge */}
      <div className="relative inline-flex items-center gap-2 rounded-full border border-[#EB5624]/50 bg-gradient-to-r from-[#1b232c]/90 via-[#221c1a]/95 to-[#1b232c]/90 px-4 py-1.5 shadow-lg shadow-black/50 backdrop-blur-md">
        <Sparkles className="h-3.5 w-3.5 text-[#FF7A45] animate-pulse" />
        <span className="text-xs font-bold tracking-wider text-amber-200 uppercase">
          Year-End Holiday Celebration • Official Ballot
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#EB5624]" />
      </div>

      {/* Main Title */}
      <h1 className="relative mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl md:text-6xl drop-shadow-md">
        <span className="bg-gradient-to-b from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
          {eventTitle}
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mx-auto mt-3 max-w-2xl px-4 text-sm text-slate-300 sm:text-base leading-relaxed">
        {eventSubtitle}
      </p>

      {/* Guidelines pills */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 px-4 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#161c24]/90 px-3.5 py-1 text-slate-200 shadow-sm">
          <Users className="h-3.5 w-3.5 text-[#EB5624]" />
          Nexusguard Team Members Only
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EB5624]/40 bg-[#251b18]/90 px-3.5 py-1 text-amber-200 shadow-sm">
          <Star className="h-3.5 w-3.5 text-[#EB5624] fill-[#EB5624]" />
          One Vote Per Person
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#161c24]/90 px-3.5 py-1 text-slate-200 shadow-sm">
          <Lock className="h-3.5 w-3.5 text-amber-400" />
          Confidential Ballot
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-[#1f1a14]/90 px-3.5 py-1 text-amber-300 shadow-sm">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          Raffle & Results Revealed at Party
        </span>
      </div>
    </header>
  );
};
