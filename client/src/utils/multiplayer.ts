import * as Colyseus from "@colyseus/sdk";
import { DOMAIN } from "./constants";

export const CLIENT = new Colyseus.Client(
  process.env.NODE_ENV === "production"
    ? `wss://${DOMAIN}`
    : "ws://localhost:2567",
);
