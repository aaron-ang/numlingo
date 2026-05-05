import { Schema, MapSchema, type } from "@colyseus/schema";

export type PlayerStatus = "idle" | "playing" | "done";

export class Player extends Schema {
  @type("number") solved: number = 0;
  @type("string") status: PlayerStatus = "idle";
}

export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
