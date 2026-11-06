import * as Colyseus from "@colyseus/sdk";
import { toast } from "react-toastify";

import { CLIENT } from "./multiplayer";
import { useAppStore, type PlayerInfo } from "./store";

// Owns the multiplayer room outside React so it survives the Game component
// unmounting (e.g. while the results screen is shown).

let current: Colyseus.Room | null = null;
// True for user-initiated leaves and server "shutdown" — onLeave can't
// distinguish those from a failed reconnect, so we tag them ourselves.
let cleanExit = false;
const closedListeners = new Set<() => void>();

/** Subscribe to the current room going away for any reason. */
export const onRoomClosed = (cb: () => void) => {
  closedListeners.add(cb);
  return () => {
    closedListeners.delete(cb);
  };
};

const close = () => {
  current = null;
  useAppStore.getState().clearRoom();
  closedListeners.forEach((cb) => cb());
};

const attach = (room: Colyseus.Room) => {
  // leaveRoom tears down before the server acks the leave, so late events
  // from a room we've already left must not touch current state.
  const isCurrent = () => current === room;
  const store = useAppStore.getState;

  // Older servers send bare session ids; accept both during a rolling deploy.
  room.onMessage("players", (players: (PlayerInfo | string)[]) => {
    if (!isCurrent()) return;
    store().setPlayers(
      players.map((p) => (typeof p === "string" ? { id: p, name: p } : p)),
    );
  });
  room.onMessage("round", ({ seed }: { seed: number }) => {
    if (!isCurrent()) return;
    store().setSeed(seed);
    store().updatePlayerScores((prev) =>
      Object.fromEntries(Object.keys(prev).map((id) => [id, 0])),
    );
  });
  room.onMessage("update", (res: { id: string; solved: number }) => {
    if (isCurrent())
      store().updatePlayerScores((prev) => ({ ...prev, [res.id]: res.solved }));
  });
  room.onMessage("final", (res: { id: string; solved: number }) => {
    if (isCurrent())
      store().updateFinalScores((prev) => ({ ...prev, [res.id]: res.solved }));
  });
  room.onMessage("shutdown", () => {
    if (!isCurrent()) return;
    cleanExit = true;
    // Don't waste retries against a host we know is going away.
    room.reconnection.enabled = false;
    toast.info("The server is restarting. Join again in a minute.");
  });

  room.onDrop(() => {
    if (!isCurrent() || cleanExit) return;
    toast.info("Connection lost. Reconnecting…");
  });

  room.onLeave((code) => {
    console.log(`${room.sessionId} left with code ${code}`);
    if (!isCurrent()) return;
    if (!cleanExit) toast.error("Disconnected from the room.");
    cleanExit = false;
    close();
  });

  room.onError((code, message) => {
    console.error(`error occurred with code ${code}:`, message);
  });
};

export const joinRoom = async (locale: string, name: string) => {
  cleanExit = false;
  const room = await CLIENT.joinOrCreate(locale, { name });
  current = room;
  attach(room);
  room.send("sync");
  useAppStore.getState().setGameRoom(room);
  console.log(room.sessionId, "joined", room.name);
  return room;
};

export const leaveRoom = () => {
  const room = current;
  if (!room) return;
  cleanExit = true;
  // Skip the SDK's reconnect path entirely on a user-initiated leave.
  room.reconnection.enabled = false;
  // Tear down now instead of waiting for the server to run onLeave and
  // close the socket; the leave finishes in the background.
  close();
  room.leave().catch((e) => console.error("LEAVE ERROR", e));
};

export const send = (type: string) => current?.send(type);
