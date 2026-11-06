"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AnswerSlots, { type Flash } from "./AnswerSlots";
import LanguageMenu from "./LanguageMenu";
import Leaderboard from "./Leaderboard";
import LoadingButton from "./LoadingButton";
import { DEFAULT_LOCALE, DEFAULT_TIMEOUT } from "@/utils/constants";
import { languageName } from "@/utils/languages";
import { numToString } from "@/utils/numberConverter";
import { MAX_DIGITS, numberAt, randomSeed } from "@/utils/random";
import { joinRoom, leaveRoom, onRoomClosed, send } from "@/utils/session";
import { useAppStore } from "@/utils/store";

export const NAME_KEY = "numlingo:name";
const ROUND_MS = DEFAULT_TIMEOUT * 1000;
const TICK_MS = 200;

const Game = () => {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? "");

  const {
    solved,
    seed,
    gameRoom,
    communicating,
    incrementSolved,
    resetSolved,
    incrementAttempted,
    resetAttempted,
    updateIncorrect,
    resetIncorrect,
    setCommunicating,
    setIsCompleted,
    updatePlayerScores,
  } = useAppStore();

  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [answer, setAnswer] = useState("");
  const [flash, setFlash] = useState<Flash>(null);

  // Prompts come from a seeded sequence so everyone in a room shares them.
  const [sequence, setSequence] = useState(() => ({
    seed: seed ?? randomSeed(),
    index: 0,
  }));
  // The room dealt a new round: restart the sequence, but never mid-round.
  if (seed !== null && seed !== sequence.seed && endAt === null) {
    setSequence({ seed, index: 0 });
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  const isTiming = endAt !== null;
  // numberAt replays the sequence from the start; don't redo it every tick.
  const number = useMemo(
    () => numberAt(sequence.seed, sequence.index),
    [sequence.seed, sequence.index],
  );
  const prompt = numToString(number, locale);
  const remainingMs = isTiming ? Math.max(0, endAt - now) : ROUND_MS;
  const seconds = Math.ceil(remainingMs / 1000);

  const finishRound = useEffectEvent(() => {
    send("end");
    setEndAt(null);
    updatePlayerScores((prev) =>
      Object.fromEntries(Object.keys(prev).map((key) => [key, 0])),
    );
    setIsCompleted(true);
  });

  // Count down from a fixed end time so the clock can't drift.
  useEffect(() => {
    if (endAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      if (t >= endAt) {
        clearInterval(id);
        finishRound();
      } else {
        setNow(t);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [endAt]);

  // Leaving or losing the room abandons any round in progress.
  const handleRoomClosed = useEffectEvent(() => {
    if (endAt === null) return;
    setEndAt(null);
    setAnswer("");
    resetSolved();
    resetAttempted();
    resetIncorrect();
  });
  useEffect(() => onRoomClosed(() => handleRoomClosed()), []);

  useEffect(() => {
    if (!languageMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!languageDropdownRef.current?.contains(e.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLanguageMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [languageMenuOpen]);

  const selectLanguage = (nextLocale: string) => {
    setLocale(nextLocale);
    setLanguageMenuOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS);
    setAnswer(digits);
    if (!isTiming && digits) {
      const start = Date.now();
      setNow(start);
      setEndAt(start + ROUND_MS);
      setLanguageMenuOpen(false);
      send("start");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !answer) return;
    if (parseInt(answer, 10) === number) {
      send("solve");
      incrementSolved();
      setSequence((s) => ({ ...s, index: s.index + 1 }));
      setFlash((f) => ({ kind: "hit", n: (f?.n ?? 0) + 1 }));
    } else {
      updateIncorrect((prev) => ({
        ...prev,
        [prompt]: { number, count: (prev[prompt]?.count ?? 0) + 1 },
      }));
      setFlash((f) => ({ kind: "miss", n: (f?.n ?? 0) + 1 }));
    }
    setAnswer("");
    incrementAttempted();
  };

  const handleJoin = async () => {
    const trimmed = name.trim();
    localStorage.setItem(NAME_KEY, trimmed);
    setCommunicating(true);
    try {
      await joinRoom(locale, trimmed);
    } catch (e) {
      console.error("JOIN ERROR", e);
      toast.error("Couldn't reach the game server. Try again in a minute.");
    } finally {
      setCommunicating(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div ref={languageDropdownRef} className="relative">
        {gameRoom || isTiming ? (
          <p
            className="text-muted px-4 py-2 text-lg"
            title={gameRoom ? "Leave the room to change language" : undefined}
          >
            {languageName(locale)}
          </p>
        ) : (
          <button
            type="button"
            className="text-muted hover:text-paper border-line inline-flex items-center gap-2 rounded-full border px-4 py-2 text-lg transition-colors"
            aria-expanded={languageMenuOpen}
            aria-controls="language-menu"
            onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
          >
            {languageName(locale)}
            <svg
              className={`h-2.5 w-2.5 transition-transform ${languageMenuOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 10 6"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 1 4 4 4-4"
              />
            </svg>
          </button>
        )}

        {languageMenuOpen && (
          <LanguageMenu selectOption={selectLanguage} currentLocale={locale} />
        )}
      </div>

      <h1
        lang={locale}
        aria-live="polite"
        className="font-display text-paper mt-10 mb-12 max-w-[24ch] text-[clamp(2.25rem,7vw,4.75rem)] leading-[1.1] font-medium text-balance [overflow-wrap:anywhere] hyphens-auto"
      >
        {prompt}
      </h1>

      <AnswerSlots
        ref={inputRef}
        value={answer}
        flash={flash}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />

      <div className="mt-8 flex w-full max-w-sm items-center gap-4">
        <div
          className="bg-line h-1.5 flex-1 overflow-hidden rounded-full"
          role="progressbar"
          aria-label="Time left"
          aria-valuemin={0}
          aria-valuemax={DEFAULT_TIMEOUT}
          aria-valuenow={seconds}
        >
          <div
            className={`h-full rounded-full ${!isTiming ? "bg-rule" : seconds <= 10 ? "bg-coral" : "bg-saffron"} motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-linear`}
            style={{ width: `${(remainingMs / ROUND_MS) * 100}%` }}
          />
        </div>
        <span className="font-display text-paper w-[3ch] text-right text-2xl tabular-nums">
          {seconds}
        </span>
      </div>

      <p className="text-muted mt-4 min-h-6 text-base">
        {isTiming ? (
          <>
            Solved <span className="text-mint">{solved}</span>
          </>
        ) : (
          "Type the digits, then press Enter. The clock starts when you type."
        )}
      </p>

      <div className="mt-12 flex w-full flex-col items-center">
        {communicating ? (
          <LoadingButton label="Joining room…" />
        ) : gameRoom ? (
          <>
            <Leaderboard final={false} />
            <button
              type="button"
              onClick={leaveRoom}
              className="text-muted hover:text-paper mt-6 rounded-full px-4 py-2 text-base underline-offset-4 hover:underline"
            >
              Leave room
            </button>
          </>
        ) : isTiming ? null : (
          <form
            className="flex flex-col items-center gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
          >
            <label htmlFor="player-name" className="sr-only">
              Your name
            </label>
            <input
              id="player-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={16}
              autoComplete="nickname"
              className="border-rule placeholder:text-muted text-paper w-48 rounded-full border bg-transparent px-4 py-2.5 text-lg"
            />
            <button
              type="submit"
              className="border-paper text-paper hover:bg-paper hover:text-ink rounded-full border px-5 py-2.5 text-lg font-semibold transition-colors"
            >
              Play with friends
            </button>
          </form>
        )}
      </div>

      <ToastContainer position="bottom-center" theme="dark" autoClose={3000} />
    </div>
  );
};

export default Game;
