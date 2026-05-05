import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import basicAuth from "express-basic-auth";

import { MyRoom } from "./rooms/MyRoom";

const ROOMS = [
  "ar",
  "az",
  "bn",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fa",
  "fr",
  "gu",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "kn",
  "ko",
  "lt",
  "ms",
  "nb",
  "nl",
  "pa-Guru",
  "pl",
  "pt",
  "ro",
  "ru",
  "sr-Latn",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh",
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
