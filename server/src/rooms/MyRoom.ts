import { Room, Client, CloseCode } from "@colyseus/core";
import { MyRoomState, Player } from "./schema/MyRoomState";

const RECONNECTION_SECONDS = 60;

export class MyRoom extends Room<{ state: MyRoomState }> {
  maxClients = 4;

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

    this.onMessage("start", async (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || player.status !== "idle") return;
      player.status = "playing";
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
    });
  }

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new Player());
    console.log(client.sessionId, "joined!");
    this.broadcast("players", [...this.state.players.keys()]);
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
    this.broadcast("players", [...this.state.players.keys()]);
    await this.maybeReset();
  }

  // Reopen the room once no players are mid-game; reset everyone's status
  // so the next round starts cleanly.
  private async maybeReset() {
    if (this.state.players.size === 0) {
      if (this.locked) await this.unlock();
      return;
    }
    const stillPlaying = [...this.state.players.values()].some(
      (p) => p.status === "playing",
    );
    if (stillPlaying) return;
    this.state.players.forEach((p) => {
      p.status = "idle";
      p.solved = 0;
    });
    if (this.locked) await this.unlock();
  }
}
