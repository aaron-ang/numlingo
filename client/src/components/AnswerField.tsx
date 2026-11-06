import { useState, type Ref } from "react";

export type Flash = { kind: "hit" | "miss"; n: number } | null;

type AnswerFieldProps = {
  ref: Ref<HTMLInputElement>;
  value: string;
  maxLength: number;
  flash: Flash;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

// One field sized for the longest answer, so its shape gives nothing away.
// A real (transparent) input sits on top so typing, paste, mobile keyboards
// and screen readers all work as usual.
const AnswerField = ({
  ref,
  value,
  maxLength,
  flash,
  onChange,
  onKeyDown,
}: AnswerFieldProps) => {
  // autoFocus fires onFocus; browsers that skip it (mobile) stay unfocused.
  const [focused, setFocused] = useState(false);
  const border =
    flash?.kind === "miss"
      ? "border-coral motion-safe:animate-miss"
      : `${focused ? "border-saffron" : "border-rule"} ${flash?.kind === "hit" ? "animate-hit" : ""}`;

  return (
    <div className="relative">
      <div
        // Re-key on each answer so the feedback animation replays.
        key={flash?.n ?? 0}
        className={`font-display bg-slate text-paper flex h-20 items-center justify-center rounded-xl border-2 px-6 text-5xl font-semibold tracking-[0.15em] tabular-nums sm:h-24 sm:text-6xl ${border}`}
        style={{ width: `${maxLength + 2}ch` }}
        aria-hidden="true"
        data-testid="answer-field"
        data-flash={flash?.kind}
      >
        {value}
        {focused && value.length < maxLength && (
          <span className="bg-saffron motion-safe:animate-caret ml-1 h-[0.8em] w-1 rounded-full" />
        )}
      </div>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="Your answer in digits"
        maxLength={maxLength}
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

export default AnswerField;
