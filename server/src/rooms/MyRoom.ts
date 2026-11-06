import { Room, Client, CloseCode } from "@colyseus/core";
import { MyRoomState, Player } from "./schema/MyRoomState";

const RECONNECTION_SECONDS = 60;
const MAX_NAME_LENGTH = 16;

const newSeed = () => Math.floor(Math.random() * 2 ** 32);

// Strip control characters, collapse whitespace, cap length.
export const sanitizeName = (raw: unknown): string =>
  typeof raw === "string"
    ? raw
        .replace(/[\p{C}]/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        // Slice by code point so an emoji is never split into a lone surrogate.
        .match(new RegExp(`^.{0,${MAX_NAME_LENGTH}}`, "su"))![0]
        .trimEnd()
    : "";

export class MyRoom extends Room<{ state: MyRoomState }> {
  maxClients = 4;
  // Every player in a round gets the same number sequence from this seed.
  private seed = newSeed();
  private joinCount = 0;

  onCreate(_options: { lang: string }) {
    this.state = new MyRoomState();

    this.onMessage("solve", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.status !== "playing") return;
      player.solved++;
      this.broadcast("update", {
        id: client.sessionId,
        solved: player.solved,
      });
    });

    // SDK 0.18 drops messages sent before the client registers handlers.
    this.onMessage("sync", (client) => {
      client.send("round", { seed: this.seed });
      client.send("players", this.playerList());
    });

    this.onMessage("start", async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.status !== "idle") return;
      player.status = "playing";
      this.broadcastPlayers();
      // Lock once anyone has started so new joiners can't slip into a live game.
      if (!this.locked) await this.lock();
    });

    this.onMessage("end", async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.status !== "playing") return;
      player.status = "done";
      this.broadcast("final", {
        id: client.sessionId,
        solved: player.solved,
      });
      await this.maybeReset();
      this.broadcastPlayers();
    });
  }

  onJoin(client: Client, options?: { name?: unknown }) {
    const player = new Player();
    player.name = sanitizeName(options?.name) || `Player ${++this.joinCount}`;
    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined!");
    this.broadcast("players", this.playerList(), { except: client });
  }

  async onLeave(client: Client, code?: number) {
    console.log(client.sessionId, "left!", "code=", code);
    if (code === CloseCode.CONSENTED) {
      await this.removePlayer(client.sessionId);
      return;
    }
    try {
      await this.allowReconnection(client, RECONNECTION_SECONDS);
      console.log(client.sessionId, "reconnected!");
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.broadcast("update", {
          id: client.sessionId,
          solved: player.solved,
        });
      }
    } catch (e) {
      console.error("RECONNECT FAILED", client.sessionId, e);
      await this.removePlayer(client.sessionId);
    }
  }

  async onBeforeShutdown() {
    console.log("room", this.roomId, "shutting down — notifying clients");
    this.broadcast("shutdown");
    await this.disconnect();
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  private async removePlayer(sessionId: string) {
    if (!this.state.players.has(sessionId)) return;
    this.state.players.delete(sessionId);
    await this.maybeReset();
    this.broadcastPlayers();
  }

  private playerList() {
    return [...this.state.players.entries()].map(([id, p]) => ({
      id,
      name: p.name,
      status: p.status,
    }));
  }

  private broadcastPlayers() {
    this.broadcast("players", this.playerList());
  }

  // Reopen the room once no players are mid-game; reset everyone's status
  // and pick a fresh seed so the next round starts cleanly.
  private async maybeReset() {
    if (this.state.players.size === 0) {
      this.seed = newSeed();
      if (this.locked) await this.unlock();
      return;
    }
    const stillPlaying = [...this.state.players.values()].some(
      (p) => p.status === "playing",
    );
    if (stillPlaying) return;
    // Only a finished round needs new numbers; if nobody got that far
    // (e.g. the only active player left), idle players keep their sequence.
    const roundFinished = [...this.state.players.values()].some(
      (p) => p.status === "done",
    );
    if (roundFinished) {
      this.state.players.forEach((p) => {
        p.status = "idle";
        p.solved = 0;
      });
      this.seed = newSeed();
      this.broadcast("round", { seed: this.seed });
    }
    if (this.locked) await this.unlock();
  }
}
