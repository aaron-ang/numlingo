import assert from "assert";
import { describe, before, after, beforeEach, it } from "mocha";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import your "app.config.ts" file here.
import appConfig from "../src/app.config";
import { sanitizeName } from "../src/rooms/MyRoom";
import { MyRoomState } from "../src/rooms/schema/MyRoomState";

type PlayerInfo = { id: string; name: string; status: string };

// Joins broadcast "players" too, so an earlier list may still be in flight.
// Resolve on the first broadcast matching `expected` (order-insensitive).
function waitForPlayers(
  client: {
    onMessage: (type: string, cb: (msg: PlayerInfo[]) => void) => () => void;
  },
  expected: () => string[],
) {
  return new Promise<PlayerInfo[]>((resolve) => {
    const off = client.onMessage("players", (list) => {
      const want = expected();
      const ids = list.map((p) => p.id);
      if (ids.length === want.length && want.every((id) => ids.includes(id))) {
        off();
        resolve(list);
      }
    });
  });
}

describe("testing your Colyseus app", () => {
  let colyseus: ColyseusTestServer;

  before(async () => (colyseus = await boot(appConfig)));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into a room", async () => {
    // `room` is the server-side Room instance reference.
    const room = await colyseus.createRoom<MyRoomState>("en", {});

    // `client1` is the client-side `Room` instance reference (same as JavaScript SDK)
    const client1 = await colyseus.connectTo(room);

    // make your assertions
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);

    // wait for state sync
    await room.waitForNextPatch();

    const player = room.state.players.get(client1.sessionId);
    assert.ok(player);
    assert.strictEqual(player.solved, 0);
  });

  it("broadcasts the player list when someone joins", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);

    let client2Id = "";
    const players = waitForPlayers(client1, () => [
      client1.sessionId,
      client2Id,
    ]);
    const client2 = await colyseus.connectTo(room);
    client2Id = client2.sessionId;

    await players;
  });

  it("uses the requested name, or a default", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room, { name: "  Ada \n L " });
    const client2 = await colyseus.connectTo(room);

    const list = await waitForPlayers(client2, () => [
      client1.sessionId,
      client2.sessionId,
    ]);
    const names = Object.fromEntries(list.map((p) => [p.id, p.name]));
    assert.strictEqual(names[client1.sessionId], "Ada L");
    assert.strictEqual(names[client2.sessionId], "Player 1");
  });

  it("sanitizes names", () => {
    assert.strictEqual(sanitizeName(42), "");
    assert.strictEqual(sanitizeName("a\u0000b"), "ab");
    assert.strictEqual(sanitizeName("x".repeat(40)).length, 16);
    assert.strictEqual(
      sanitizeName("x".repeat(15) + "😀"),
      "x".repeat(15) + "😀",
    );
    assert.strictEqual(sanitizeName("x".repeat(15) + " y"), "x".repeat(15));
  });

  it("gives every player in a room the same seed", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    const seed1 = client1.waitForMessage("round");
    const client2 = await colyseus.connectTo(room);
    const seed2 = client2.waitForMessage("round");

    const [a, b] = await Promise.all([seed1, seed2]);
    assert.strictEqual(typeof a.seed, "number");
    assert.strictEqual(a.seed, b.seed);
  });

  it("deals a new seed once a round finishes", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    const first = await client1.waitForMessage("round");

    client1.send("start");
    await room.waitForMessage("start");
    const next = client1.waitForMessage("round");
    client1.send("end");

    assert.notStrictEqual((await next).seed, first.seed);
  });

  it("ignores solve before the player starts", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);

    client1.send("solve");
    await room.waitForMessage("solve");

    assert.strictEqual(room.state.players.get(client1.sessionId)!.solved, 0);
  });

  it("counts solves and broadcasts updates once started", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);

    client1.send("start");
    await room.waitForMessage("start");

    const update = client2.waitForMessage("update");
    client1.send("solve");

    assert.deepStrictEqual(await update, {
      id: client1.sessionId,
      solved: 1,
    });
    const player = room.state.players.get(client1.sessionId)!;
    assert.strictEqual(player.status, "playing");
    assert.strictEqual(player.solved, 1);
  });

  it("broadcasts player status as rounds start and finish", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);
    const statusOf = (list: PlayerInfo[], id: string) =>
      list.find((p) => p.id === id)?.status;

    const playing = new Promise<void>((resolve) => {
      const off = client2.onMessage("players", (list: PlayerInfo[]) => {
        if (statusOf(list, client1.sessionId) === "playing") {
          off();
          resolve();
        }
      });
    });
    client1.send("start");
    await playing;

    // Only player finishes: round resets, so everyone is idle again.
    const idle = new Promise<void>((resolve) => {
      const off = client2.onMessage("players", (list: PlayerInfo[]) => {
        if (statusOf(list, client1.sessionId) === "idle") {
          off();
          resolve();
        }
      });
    });
    client1.send("end");
    await idle;
  });

  it("locks the room when a game starts", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);

    client1.send("start");
    await room.waitForMessage("start");

    assert.strictEqual(room.locked, true);
  });

  it("stays locked until every player has finished", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);

    client1.send("start");
    client2.send("start");
    await room.waitForMessage("start");
    await room.waitForMessage("start");

    client1.send("solve");
    await room.waitForMessage("solve");

    const final = client2.waitForMessage("final");
    client1.send("end");
    assert.deepStrictEqual(await final, { id: client1.sessionId, solved: 1 });
    assert.strictEqual(room.locked, true);
    assert.strictEqual(
      room.state.players.get(client1.sessionId)!.status,
      "done",
    );

    client2.send("end");
    await room.waitForMessage("end");

    assert.strictEqual(room.locked, false);
    room.state.players.forEach((p) => {
      assert.strictEqual(p.status, "idle");
      assert.strictEqual(p.solved, 0);
    });
  });

  it("removes a player who leaves and tells the others", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);

    const players = waitForPlayers(client2, () => [client2.sessionId]);
    await client1.leave();
    await players;

    assert.strictEqual(room.state.players.has(client1.sessionId), false);
  });

  it("unlocks the room when a mid-game leave leaves no one playing", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);

    client1.send("start");
    await room.waitForMessage("start");
    assert.strictEqual(room.locked, true);

    const players = waitForPlayers(client2, () => [client2.sessionId]);
    await client1.leave();
    await players;

    assert.strictEqual(room.locked, false);
  });

  it("keeps a dropped player's slot for reconnection", async () => {
    const room = await colyseus.createRoom<MyRoomState>("en", {});
    const client1 = await colyseus.connectTo(room);
    client1.reconnection.enabled = false;

    await client1.leave(false);
    await room.waitForNextPatch();

    assert.strictEqual(room.state.players.has(client1.sessionId), true);
  });
});
