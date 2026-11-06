import { useState, type Ref } from "react";

import { MAX_DIGITS } from "@/utils/random";

export type Flash = { kind: "hit" | "miss"; n: number } | null;

const SLOTS = MAX_DIGITS;

type AnswerSlotsProps = {
  ref: Ref<HTMLInputElement>;
  value: string;
  flash: Flash;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

// One cell per digit. A real (transparent) input sits on top so typing,
// paste, mobile keyboards and screen readers all work as usual.
const AnswerSlots = ({
  ref,
  value,
  flash,
  onChange,
  onKeyDown,
}: AnswerSlotsProps) => {
  const [focused, setFocused] = useState(true);
  const tone =
    flash?.kind === "miss"
      ? "border-coral motion-safe:animate-miss"
      : flash?.kind === "hit"
        ? "border-mint motion-safe:animate-hit"
        : "border-rule";

  return (
    <div className="relative">
      <div
        // Re-key on each answer so the feedback animation replays.
        key={flash?.n ?? 0}
        className="flex gap-3"
        aria-hidden="true"
        data-testid="answer-slots"
        data-flash={flash?.kind}
      >
        {Array.from({ length: SLOTS }, (_, i) => {
          const char = value[i];
          const active = focused && i === value.length;
          return (
            <span
              key={i}
              className={`font-display bg-slate relative flex h-20 w-16 items-center justify-center rounded-xl border-2 text-5xl font-semibold tabular-nums sm:h-24 sm:w-20 sm:text-6xl ${
                active ? "border-saffron" : tone
              } text-paper`}
            >
              {char}
              {active && (
                <span className="bg-saffron motion-safe:animate-caret absolute bottom-3 h-1 w-6 rounded-full" />
              )}
            </span>
          );
        })}
      </div>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="Your answer in digits"
        maxLength={SLOTS}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
};

export default AnswerSlots;
