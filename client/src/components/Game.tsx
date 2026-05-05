"use client";

import { useState, useRef, useEffect } from "react";
import * as Colyseus from "@colyseus/sdk";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LanguageMenu from "./LanguageMenu";
import Leaderboard from "./Leaderboard";
import LoadingButton from "./LoadingButton";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_LOCALE,
  DEFAULT_TIMEOUT,
} from "@/utils/constants";
import { isEmpty } from "@/utils/helper";
import { CLIENT } from "@/utils/multiplayer";
import { numToString } from "@/utils/numberConverter";
import { useAppStore } from "@/utils/store";

const Game = () => {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const [{ number, prompt }, setPromptState] = useState(() => {
    const num = Math.floor(Math.random() * 1000);
    return { number: num, prompt: numToString(num, DEFAULT_LOCALE) };
  });
  const [seconds, setSeconds] = useState(DEFAULT_TIMEOUT);
  const [isTiming, setIsTiming] = useState(false);

  const {
    solved,
    gameRoom,
    playerScores,
    communicating,
    incrementSolved,
    updateIncorrect,
    setCommunicating,
    setIsCompleted,
    incrementAttempted,
    setGameRoom,
    updateFinalScores,
    updatePlayerScores,
    setPlayerScores,
    setFinalScores,
  } = useAppStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True for user-initiated leaves and server "shutdown" — onLeave can't
  // distinguish those from a failed reconnect, so we tag them ourselves.
  const cleanExitRef = useRef(false);

  useEffect(() => {
    if (!languageMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(e.target as Node)
      ) {
        setLanguageMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [languageMenuOpen]);

  const stopTimer = () => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (endTimeoutRef.current) {
      clearTimeout(endTimeoutRef.current);
      endTimeoutRef.current = null;
    }
  };

  const generatePrompt = (nextLocale: string) => {
    const num = Math.floor(Math.random() * 1000);
    setPromptState({ number: num, prompt: numToString(num, nextLocale) });
  };

  const selectOption = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const nextLocale = e.currentTarget.id;
    setLanguage(e.currentTarget.innerText);
    setLocale(nextLocale);
    setLanguageMenuOpen(false);
    generatePrompt(nextLocale);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isTiming) {
      setIsTiming(true);
      tickIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);

      endTimeoutRef.current = setTimeout(() => {
        roomRef.current?.send("end");
        stopTimer();
        setIsTiming(false);
        setSeconds(DEFAULT_TIMEOUT);
        updatePlayerScores((prev) => {
          return Object.fromEntries(Object.keys(prev).map((key) => [key, 0]));
        });
        setIsCompleted(true);
      }, DEFAULT_TIMEOUT * 1000);

      roomRef.current?.send("start");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const inputNumber = parseInt(inputRef.current!.value);
      if (inputNumber === number) {
        roomRef.current?.send("solve");
        inputRef.current!.value = "";
        incrementSolved();
        generatePrompt(locale);
      } else {
        promptRef.current!.style.color = "red";
        updateIncorrect((prev) => ({
          ...prev,
          [prompt]: (prev[prompt] || 0) + 1,
        }));
        setTimeout(() => {
          promptRef.current!.style.color = "white";
        }, 500);
      }
      incrementAttempted();
    }
  };

  const tearDown = () => {
    stopTimer();
    roomRef.current = null;
    setGameRoom(null);
    setPlayerScores({});
    setFinalScores({});
    setIsTiming(false);
    setIsCompleted(false);
    setSeconds(DEFAULT_TIMEOUT);
  };

  const setRoomCallbacks = (room: Colyseus.Room) => {
    room.onMessage("players", (res: string[]) => {
      setPlayerScores(Object.fromEntries(res.map((playerID) => [playerID, 0])));
      setFinalScores(Object.fromEntries(res.map((playerID) => [playerID, -1])));
    });
    room.onMessage("update", (res: { id: string; solved: number }) => {
      updatePlayerScores((prev) => ({ ...prev, [res.id]: res.solved }));
    });
    room.onMessage("final", (res: { id: string; solved: number }) => {
      updateFinalScores((prev) => ({ ...prev, [res.id]: res.solved }));
    });
    room.onMessage("shutdown", () => {
      cleanExitRef.current = true;
      // Don't waste retries against a host we know is going away.
      room.reconnection.enabled = false;
      toast.info("Server is restarting. Please rejoin in a moment.");
    });

    room.onDrop(() => {
      if (cleanExitRef.current) return;
      toast.info("Connection lost. Reconnecting…");
    });

    room.onLeave((code) => {
      console.log(`${room.sessionId} left with code ${code}`);
      if (!cleanExitRef.current) {
        toast.error("Disconnected.");
      }
      cleanExitRef.current = false;
      tearDown();
    });

    room.onError((code, message) => {
      console.error(`error occurred with code ${code}:`, message);
    });
  };

  const joinRoom = async () => {
    setCommunicating(true);
    cleanExitRef.current = false;
    try {
      const room = await CLIENT.joinOrCreate(locale);
      roomRef.current = room;
      setGameRoom(room);
      setRoomCallbacks(room);
      console.log(room.sessionId, "joined", room.name);
    } catch (e) {
      console.error("JOIN ERROR", e);
      toast.error("Unable to connect. Please try again later.");
    } finally {
      setCommunicating(false);
    }
  };

  const leaveRoom = () => {
    cleanExitRef.current = true;
    if (roomRef.current) {
      // Skip the SDK's reconnect path entirely on a user-initiated leave.
      roomRef.current.reconnection.enabled = false;
      roomRef.current.leave();
    }
  };

  return (
    <>
      <div ref={languageDropdownRef} className="relative text-center">
        {isTiming ? (
          <>
            <h1 className="text-3xl text-emerald-400">{solved}</h1>
            <h1 className="text-text-accent text-5xl">{seconds}</h1>
          </>
        ) : gameRoom ? (
          <h1 className="text-accent text-2xl sm:text-3xl">{language}</h1>
        ) : (
          <button
            className={`text-text-muted hover:text-text-accent inline-flex items-center text-2xl first-letter:text-center hover:cursor-pointer sm:text-3xl ${languageMenuOpen && "text-text-accent"}`}
            onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
          >
            {language}
            <svg
              className="ml-2.5 h-2.5 w-2.5"
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
          <LanguageMenu selectOption={selectOption} currentLocale={locale} />
        )}
      </div>
      <h1
        ref={promptRef}
        className="text-text-accent my-10 text-center text-3xl font-medium md:text-5xl lg:text-7xl"
      >
        {prompt}
      </h1>

      <input
        type="number"
        ref={inputRef}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoFocus
        className="border-sub-color text-text-accent w-1/2 rounded border bg-transparent px-5 py-2 text-center text-2xl"
      />

      {communicating ? (
        <LoadingButton />
      ) : isTiming ? null : gameRoom ? (
        <button
          onClick={leaveRoom}
          className="text-text-muted hover:bg-sub-color hover:text-accent m-3 cursor-pointer rounded-md px-3 py-2 text-xl font-medium sm:text-2xl"
          aria-current="page"
        >
          Leave
        </button>
      ) : (
        <button
          onClick={joinRoom}
          className="text-text-muted hover:bg-sub-color hover:text-accent m-3 cursor-pointer rounded-md px-3 py-2 text-xl font-medium sm:text-2xl"
          aria-current="page"
        >
          Join Multiplayer
        </button>
      )}

      {!isEmpty(playerScores) && <Leaderboard final={false} />}

      <ToastContainer
        position="bottom-center"
        hideProgressBar
        autoClose={300}
      />
    </>
  );
};

export default Game;
