import React, { useEffect, useState } from 'react';
import { Clock, Gift, Sparkles } from 'lucide-react';

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
  deadlineLabel = 'Sept 18, 6:00 PM Philippine Standard Time (PST / UTC+8)',
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
      className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#142e22] via-[#0f231a] to-[#0a1811] p-6 shadow-2xl backdrop-blur-md transition-all sm:p-8"
    >
      {/* Decorative festive corner ribbon / sparkle */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-red-600/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />

      {/* Ribbon accent bar */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-red-600" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
          <Gift className="h-3.5 w-3.5 text-red-400" />
          <span>Official Poll Countdown</span>
          <Sparkles className="h-3 w-3 text-amber-300" />
        </div>

        {/* Heading */}
        <h2 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Voting Closes on <span className="text-amber-400">September 18, 6:00 PM</span>
        </h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-emerald-300/80 sm:text-sm">
          <Clock className="h-3.5 w-3.5 text-emerald-400" />
          <span>Philippine Standard Time (PHT / UTC+8)</span>
        </p>

        {timeLeft.isExpired ? (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-950/60 px-6 py-4 text-center text-red-200">
            <p className="text-base font-semibold text-red-100">
              🎄 Polls have officially closed!
            </p>
            <p className="mt-1 text-xs text-red-300">
              Thank you to everyone who participated in our Christmas Giveaway vote. Tallies are being finalized for the grand holiday drawing.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {/* Days */}
            <div className="flex flex-col items-center rounded-xl border border-amber-400/25 bg-[#183a2c]/80 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[90px]">
              <span className="font-mono text-2xl font-black text-amber-300 sm:text-4xl md:text-5xl">
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] font-bold tracking-wider text-emerald-200/90 uppercase sm:text-xs">
                Days
              </span>
            </div>

            {/* Hours */}
            <div className="flex flex-col items-center rounded-xl border border-red-500/25 bg-[#2a1416]/80 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[90px]">
              <span className="font-mono text-2xl font-black text-red-300 sm:text-4xl md:text-5xl">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] font-bold tracking-wider text-emerald-200/90 uppercase sm:text-xs">
                Hours
              </span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center rounded-xl border border-amber-400/25 bg-[#183a2c]/80 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[90px]">
              <span className="font-mono text-2xl font-black text-amber-300 sm:text-4xl md:text-5xl">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] font-bold tracking-wider text-emerald-200/90 uppercase sm:text-xs">
                Minutes
              </span>
            </div>

            {/* Seconds */}
            <div className="flex flex-col items-center rounded-xl border border-red-500/25 bg-[#2a1416]/80 p-3 shadow-lg shadow-black/40 sm:p-4 md:min-w-[90px]">
              <span className="font-mono text-2xl font-black text-red-300 sm:text-4xl md:text-5xl">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="mt-1 text-[10px] font-bold tracking-wider text-emerald-200/90 uppercase sm:text-xs">
                Seconds
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 text-xs text-slate-300/80">
          ⭐ Make your selections below. Each member may vote once with their name.
        </div>
      </div>
    </div>
  );
};
