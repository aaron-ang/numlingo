import * as Colyseus from "@colyseus/sdk";
import { DOMAIN } from "./constants";

export const CLIENT = new Colyseus.Client(
  process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.NODE_ENV === "production"
      ? `wss://${DOMAIN}`
      : "ws://localhost:2567"),
);
