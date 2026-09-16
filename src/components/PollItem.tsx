import React from 'react';
import { Check, Gift, Star, Tag } from 'lucide-react';
import type { Poll } from '../types.ts';

interface PollItemProps {
  poll: Poll;
  index: number;
  selectedValue: string | undefined;
  onSelect: (pollId: string, optionId: string) => void;
  disabled?: boolean;
}

export const PollItem: React.FC<PollItemProps> = ({
  poll,
  index,
  selectedValue,
  onSelect,
  disabled = false,
}) => {
  return (
    <section
      id={`poll-card-${poll.id}`}
      aria-labelledby={`poll-title-${poll.id}`}
      className="relative overflow-hidden rounded-2xl border border-emerald-700/40 bg-[#11241c] p-5 shadow-xl transition-all duration-300 hover:border-amber-500/40 sm:p-7"
    >
      {/* Decorative top ribbon accent */}
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-emerald-600 via-amber-400 to-red-600" />

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600/30 text-xs font-bold text-red-300 border border-red-500/40">
            {index + 1}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/80 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-emerald-800/60">
            <Gift className="h-3 w-3 text-amber-400" />
            {poll.category || 'Christmas Giveaway'}
          </span>
        </div>
        <span className="text-[11px] font-medium text-amber-300/80 flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
          Choose 1 favorite
        </span>
      </div>

      <h3
        id={`poll-title-${poll.id}`}
        className="font-serif text-lg font-bold text-white sm:text-xl leading-snug"
      >
        {poll.title}
      </h3>

      {poll.description && (
        <p className="mt-1.5 text-xs text-slate-300/85 sm:text-sm leading-relaxed">
          {poll.description}
        </p>
      )}

      {/* Options List */}
      <div
        role="radiogroup"
        aria-labelledby={`poll-title-${poll.id}`}
        className="mt-5 space-y-2.5"
      >
        {poll.options.map((option) => {
          const isSelected = selectedValue === option.id;

          return (
            <label
              key={option.id}
              htmlFor={`option-${poll.id}-${option.id}`}
              className={`group relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-3.5 sm:p-4 transition-all duration-200 ${
                disabled ? 'cursor-not-allowed opacity-60' : ''
              } ${
                isSelected
                  ? 'border-amber-400/90 bg-gradient-to-r from-[#1c382b] to-[#244234] shadow-md shadow-amber-950/30 ring-1 ring-amber-400/40'
                  : 'border-emerald-800/40 bg-[#0d1a14]/90 hover:border-emerald-600/70 hover:bg-[#14281f]'
              }`}
            >
              <input
                type="radio"
                id={`option-${poll.id}-${option.id}`}
                name={`poll-${poll.id}`}
                value={option.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onSelect(poll.id, option.id)}
                className="sr-only"
              />

              {/* Radio Indicator */}
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400 text-emerald-950'
                    : 'border-emerald-600/60 bg-emerald-950/40 group-hover:border-amber-400/60'
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>

              {/* Option Text & Description */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors ${
                      isSelected ? 'text-amber-200' : 'text-slate-100 group-hover:text-amber-100'
                    }`}
                  >
                    {option.text}
                  </span>

                  {option.badge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase transition-colors ${
                        isSelected
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                      }`}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {option.badge}
                    </span>
                  )}
                </div>

                {option.description && (
                  <p className="mt-1 text-xs text-slate-300/80 leading-normal">
                    {option.description}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
};
