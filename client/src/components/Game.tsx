"use client";

import { useState, useRef } from "react";
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
  RECONNECT_TIMEOUT_MS,
  WS_CLOSE_ERROR_CODES,
} from "@/utils/constants";
import { isEmpty, asyncWithTimeout } from "@/utils/helper";
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
  const roomRef = useRef<Colyseus.Room | null>(null);
  const intentionalLeaveRef = useRef(false);

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
      const id = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);

      setTimeout(() => {
        roomRef.current?.send("end");
        clearInterval(id);
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

  const adoptRoom = (room: Colyseus.Room) => {
    // Server-side state machine handles unlock; we run our own reconnection
    // logic in onLeave, so silence the SDK's competing 15-retry loop.
    room.reconnection.enabled = false;
    roomRef.current = room;
    setGameRoom(room);
    setRoomCallbacks(room);
  };

  const joinRoom = async () => {
    setCommunicating(true);
    intentionalLeaveRef.current = false;
    try {
      const room = await CLIENT.joinOrCreate(locale);
      adoptRoom(room);
      console.log(room.sessionId, "joined", room.name);
    } catch (e) {
      console.error("JOIN ERROR", e);
      toast.error("Unable to connect. Please try again later.");
    } finally {
      setCommunicating(false);
    }
  };

  const tearDown = () => {
    roomRef.current = null;
    setGameRoom(null);
    setPlayerScores({});
  };

  const setRoomCallbacks = (room: Colyseus.Room) => {
    room.onMessage("players", (res: string[]) => {
      setPlayerScores(Object.fromEntries(res.map((playerID) => [playerID, 0])));
      setFinalScores(Object.fromEntries(res.map((playerID) => [playerID, -1])));
    });
    room.onMessage("update", (res: { id: string; solved: number }) => {
      updatePlayerScores((prev) => ({
        ...prev,
        [res.id]: res.solved,
      }));
    });
    room.onMessage("final", (res: { id: string; solved: number }) => {
      // Server auto-unlocks when everyone is done — no need to send "unlock".
      updateFinalScores((prev) => ({ ...prev, [res.id]: res.solved }));
    });
    room.onMessage("shutdown", () => {
      // Graceful server shutdown: skip reconnect, tell user, clean up.
      intentionalLeaveRef.current = true;
      toast.info("Server is restarting. Please rejoin in a moment.");
    });

    room.onLeave(async (code: number) => {
      console.log(`${room.sessionId} left with code ${code}`);

      if (intentionalLeaveRef.current) {
        intentionalLeaveRef.current = false;
        tearDown();
        return;
      }

      toast.info("Disconnected.");
      if (!WS_CLOSE_ERROR_CODES.includes(code)) {
        tearDown();
        return;
      }

      setCommunicating(true);
      toast.info("Attempting to reconnect...");
      try {
        const newRoom = await asyncWithTimeout(
          CLIENT.reconnect(room.reconnectionToken),
          RECONNECT_TIMEOUT_MS,
        );
        adoptRoom(newRoom);
        console.log(newRoom.sessionId, "rejoined", newRoom.name);
        toast.success("Reconnected!");
      } catch (e) {
        console.error("RECONNECT ERROR", e);
        toast.error("Unable to reconnect.");
        tearDown();
      } finally {
        setCommunicating(false);
      }
    });

    room.onError((code: number, message?: string) => {
      console.error(`error occurred with code ${code}:`, message);
    });
  };

  const leaveRoom = () => {
    intentionalLeaveRef.current = true;
    roomRef.current?.leave();
  };

  return (
    <>
      <div className="relative w-full text-center">
        {isTiming ? (
          <>
            <h1 className="text-3xl text-green-900">{solved}</h1>
            <h1 className="text-5xl text-sub-color">{seconds}</h1>
          </>
        ) : gameRoom ? (
          <h1 className="text-2xl text-accent sm:text-3xl">{language}</h1>
        ) : (
          <button
            className={`inline-flex items-center text-2xl text-sub-color first-letter:text-center hover:cursor-pointer hover:text-text-accent sm:text-3xl ${languageMenuOpen && "text-text-accent"}`}
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
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="m1 1 4 4 4-4"
              />
            </svg>
          </button>
        )}

        {languageMenuOpen && <LanguageMenu selectOption={selectOption} />}
      </div>
      <h1
        ref={promptRef}
        className="my-10 text-center text-3xl font-medium text-text-accent md:text-5xl lg:text-7xl"
      >
        {prompt}
      </h1>

      <input
        type="number"
        ref={inputRef}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-1/2 rounded border border-sub-color bg-transparent px-5 py-2 text-center text-2xl text-text-accent"
      />

      {communicating ? (
        <LoadingButton />
      ) : isTiming ? null : gameRoom ? (
        <button
          onClick={leaveRoom}
          className="m-3 rounded-md px-3 py-2 text-xl font-medium text-sub-color hover:bg-sub-color hover:text-accent sm:text-2xl"
          aria-current="page"
        >
          Leave
        </button>
      ) : (
        <button
          onClick={joinRoom}
          className="m-3 rounded-md px-3 py-2 text-xl font-medium text-sub-color hover:bg-sub-color hover:text-accent sm:text-2xl"
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
