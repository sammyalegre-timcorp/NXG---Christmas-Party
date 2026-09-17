import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, Sparkles, Timer } from 'lucide-react';

interface ChristmasCountdownProps {
  deadlineISO: string;
  deadlineLabel?: string;
  onDeadlineReached?: () => void;
}

interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export const ChristmasCountdown: React.FC<ChristmasCountdownProps> = ({
  deadlineISO,
  deadlineLabel = 'September 18, 6:00 PM PST (Philippine Standard Time)',
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() => calculateTime(deadlineISO));

  function calculateTime(targetIso: string): TimeRemaining {
    const target = new Date(targetIso).getTime();
    const now = Date.now();
    const totalMs = target - now;

    if (isNaN(target) || totalMs <= 0) {
      return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const seconds = Math.floor((totalMs / 1000) % 60);
    const minutes = Math.floor((totalMs / 1000 / 60) % 60);
    const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

    return { totalMs, days, hours, minutes, seconds, isExpired: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTime(deadlineISO);
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineISO]);

  return (
    <div
      id="christmas-countdown-banner"
      className="relative overflow-hidden rounded-2xl border border-[#EB5624]/30 bg-gradient-to-b from-[#182028] via-[#131920] to-[#0d1217] p-6 shadow-2xl backdrop-blur-md transition-all sm:p-8"
    >
      {/* Decorative ambient brand glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#EB5624]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-amber-500/10 blur-2xl" />

      {/* Top brand accent ribbon */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#EB5624] via-[#FF7A45] to-[#EB5624]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#EB5624]/40 bg-[#EB5624]/10 px-4 py-1 text-xs font-bold tracking-wider text-[#FF7A45] uppercase">
          <Timer className="h-3.5 w-3.5 text-[#EB5624]" />
          <span>Official Ballot Countdown</span>
          <Sparkles className="h-3 w-3 text-amber-300" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Voting Closes on <span className="text-[#EB5624]">September 18, 6:00 PM</span>
        </h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-400 sm:text-sm">
          <Clock className="h-3.5 w-3.5 text-[#EB5624]" />
          <span>Philippine Standard Time (PST / UTC+8) • {deadlineLabel}</span>
        </p>

        {timeLeft.isExpired ? (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-950/60 px-6 py-4 text-center text-red-200">
            <p className="flex items-center justify-center gap-2 text-base font-bold text-red-100">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              Ballot Submissions Have Concluded
            </p>
            <p className="mt-1 text-xs text-red-300">
              Thank you for participating! The Nexusguard Holiday Committee is finalizing the official tallies for the celebration raffle.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {/* Days */}
            <div className="flex flex-col items-center rounded-xl border border-[#EB5624]/30 bg-[#1e2630]/90 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[95px]">
              <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-black text-[#EB5624] drop-shadow-[0_2px_8px_rgba(235,86,36,0.3)]">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-bold tracking-wider text-slate-300 uppercase">
                Days
              </span>
            </div>

            {/* Hours */}
            <div className="flex flex-col items-center rounded-xl border border-slate-700/60 bg-[#1b222a]/90 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[95px]">
              <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-black text-white">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-bold tracking-wider text-slate-300 uppercase">
                Hours
              </span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center rounded-xl border border-[#EB5624]/30 bg-[#1e2630]/90 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[95px]">
              <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-black text-[#EB5624] drop-shadow-[0_2px_8px_rgba(235,86,36,0.3)]">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-bold tracking-wider text-slate-300 uppercase">
                Minutes
              </span>
            </div>

            {/* Seconds */}
            <div className="flex flex-col items-center rounded-xl border border-slate-700/60 bg-[#1b222a]/90 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[95px]">
              <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-black text-white">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] sm:text-xs font-bold tracking-wider text-slate-300 uppercase">
                Seconds
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 text-xs text-slate-400">
          Make your selections across all active polls below. Each Nexusguard member may vote once.
        </div>
      </div>
    </div>
  );
};
