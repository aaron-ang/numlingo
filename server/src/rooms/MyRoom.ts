import { Room, Client, CloseCode } from "@colyseus/core";
import { MyRoomState, Player } from "./schema/MyRoomState";

export class MyRoom extends Room<{ state: MyRoomState }> {
  maxClients = 4;

  onCreate(_options: { lang: string }) {
    this.setState(new MyRoomState());
    this.onMessage("solve", (client) => {
      const player = this.state.players.get(client.sessionId);
      player.solved++;
      this.broadcast("update", {
        id: client.sessionId,
        solved: player.solved,
      });
    });
    this.onMessage("start", () => {
      this.lock();
    });
    this.onMessage("end", (client) => {
      const player = this.state.players.get(client.sessionId);
      this.broadcast("final", {
        id: client.sessionId,
        solved: player.solved,
      });
    });
    this.onMessage("unlock", () => {
      this.unlock();
    });
  }

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new Player());
    console.log(client.sessionId, "joined!");
    this.broadcast("players", [...this.state.players.keys()]);
  }

  async onLeave(client: Client, code?: number) {
    console.log(client.sessionId, "left!");
    try {
      if (code === CloseCode.CONSENTED) {
        throw new Error("consented leave");
      }
      // allow disconnected client to reconnect into this room
      await this.allowReconnection(client, 2.5); // sync with client timeout
      // client returned! broadcast changes.
      console.log(client.sessionId, "reconnected!");
      this.broadcast("update", {
        id: client.sessionId,
        solved: this.state.players.get(client.sessionId).solved,
      }); // update player score on clients
    } catch {
      // disconnect not recovered
    } finally {
      this.state.players.delete(client.sessionId);
      this.broadcast(
        "players",
        [...this.state.players.keys()].filter((id) => id !== client.sessionId),
      ); // refresh players state on clients
    }
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}
