import { create } from "zustand";
import * as Colyseus from "@colyseus/sdk";
import { DEFAULT_LOCALE } from "./constants";

/** Wrong answers this round, keyed by the prompt shown. */
export type PlayerStatus = "idle" | "playing" | "done";
export type PlayerInfo = { id: string; name: string; status?: PlayerStatus };

export type Missed = { [prompt: string]: { number: number; count: number } };

interface AppState {
  solved: number;
  attempted: number;
  incorrect: Missed;
  isCompleted: boolean;
  communicating: boolean;
  gameRoom: Colyseus.Room | null;
  playerScores: { [id: string]: number };
  finalScores: { [id: string]: number };
  playerNames: { [id: string]: string };
  playerStatus: { [id: string]: PlayerStatus | undefined };
  seed: number | null;
  /** Kept outside Game so remounting it doesn't reset the language. */
  locale: string;
  setLocale: (locale: string) => void;
  /** Bumped to remount the game with a fresh round. */
  gameKey: number;
  incrementSolved: () => void;
  resetSolved: () => void;
  incrementAttempted: () => void;
  resetAttempted: () => void;
  updateIncorrect: (fn: (prev: Missed) => Missed) => void;
  resetIncorrect: () => void;
  setIsCompleted: (isCompleted: boolean) => void;
  setCommunicating: (communicating: boolean) => void;
  setGameRoom: (room: Colyseus.Room | null) => void;
  updatePlayerScores: (
    fn: (prev: { [id: string]: number }) => { [id: string]: number },
  ) => void;
  setPlayerScores: (playerScores: { [id: string]: number }) => void;
  updateFinalScores: (
    fn: (prev: { [id: string]: number }) => { [id: string]: number },
  ) => void;
  setFinalScores: (finalScores: { [id: string]: number }) => void;
  setPlayers: (players: PlayerInfo[]) => void;
  setSeed: (seed: number) => void;
  clearRoom: () => void;
  resetGame: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  solved: 0,
  incrementSolved: () => set((state) => ({ solved: state.solved + 1 })),
  resetSolved: () => set({ solved: 0 }),

  attempted: 0,
  incrementAttempted: () =>
    set((state) => ({ attempted: state.attempted + 1 })),
  resetAttempted: () => set({ attempted: 0 }),

  incorrect: {},
  updateIncorrect: (fn: (prev: Missed) => Missed) =>
    set((state) => ({ incorrect: fn(state.incorrect) })),
  resetIncorrect: () => set({ incorrect: {} }),

  isCompleted: false,
  setIsCompleted: (isCompleted: boolean) => set({ isCompleted }),

  communicating: false,
  setCommunicating: (communicating: boolean) => set({ communicating }),

  gameRoom: null,
  setGameRoom: (room: Colyseus.Room | null) => set({ gameRoom: room }),

  playerScores: {},
  updatePlayerScores: (
    fn: (prev: { [id: string]: number }) => { [id: string]: number },
  ) => set((state) => ({ playerScores: fn(state.playerScores) })),
  setPlayerScores: (playerScores: { [id: string]: number }) =>
    set({ playerScores }),

  finalScores: {},
  updateFinalScores: (
    fn: (prev: { [id: string]: number }) => { [id: string]: number },
  ) => set((state) => ({ finalScores: fn(state.finalScores) })),
  setFinalScores: (finalScores: { [id: string]: number }) =>
    set({ finalScores }),

  playerNames: {},
  playerStatus: {},
  // Keep scores for players who are still here; a join or leave mid-round
  // must not wipe everyone else's progress.
  setPlayers: (players) =>
    set((state) => ({
      playerNames: Object.fromEntries(players.map((p) => [p.id, p.name])),
      playerStatus: Object.fromEntries(players.map((p) => [p.id, p.status])),
      playerScores: Object.fromEntries(
        players.map((p) => [p.id, state.playerScores[p.id] ?? 0]),
      ),
      finalScores: Object.fromEntries(
        players.map((p) => [p.id, state.finalScores[p.id] ?? -1]),
      ),
    })),

  seed: null,
  setSeed: (seed) => set({ seed }),

  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),

  gameKey: 0,
  // Everyone still in the room starts the next round unfinished.
  resetGame: () =>
    set((state) => ({
      solved: 0,
      attempted: 0,
      incorrect: {},
      isCompleted: false,
      finalScores: Object.fromEntries(
        Object.keys(state.playerNames).map((id) => [id, -1]),
      ),
      gameKey: state.gameKey + 1,
    })),

  clearRoom: () =>
    set({
      gameRoom: null,
      playerScores: {},
      finalScores: {},
      playerNames: {},
      playerStatus: {},
      seed: null,
    }),
}));
