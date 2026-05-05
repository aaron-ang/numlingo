import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import basicAuth from "express-basic-auth";

import { MyRoom } from "./rooms/MyRoom";

const ROOMS = [
  "en",
  "zh",
  "es",
  "fr",
  "ar",
  "ru",
  "pt",
  "id",
  "de",
  "ja",
  "ko",
];

export default config({
  initializeGameServer: (gameServer) => {
    for (const room of ROOMS) {
      gameServer.define(room, MyRoom, { lang: room });
    }
  },

  initializeExpress: (app) => {
    app.get("/hello_world", (_req, res) => {
      res.send("It's time to kick ass and chew bubblegum!");
    });

    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground);
    }

    // Mount the colyseus monitor only if a password is set. The monitor
    // exposes room state and lets the operator kick clients, so leaving it
    // open is unsafe — fail closed instead.
    const monitorPassword = process.env.MONITOR_PASSWORD;
    if (monitorPassword) {
      const monitorUser = process.env.MONITOR_USERNAME ?? "admin";
      app.use(
        "/colyseus",
        basicAuth({
          users: { [monitorUser]: monitorPassword },
          challenge: true,
        }),
        monitor(),
      );
    } else {
      console.warn(
        "MONITOR_PASSWORD not set — /colyseus monitor route is disabled",
      );
    }
  },

  beforeListen: () => {},
});
