export const DEFAULT_LANGUAGE = "English";
export const DEFAULT_LOCALE = "en";
export const DEFAULT_TIMEOUT = 60;
export const DOMAIN = "numlingo.onrender.com";

// Must match server-side allowReconnection() seconds in MyRoom.ts.
export const RECONNECT_TIMEOUT_MS = 60_000;

// Close codes that should trigger a reconnect attempt. Excludes CONSENTED
// (4000) since that's a clean user-initiated leave.
export const WS_CLOSE_ERROR_CODES = [
  1001, // GOING_AWAY (server restart, browser tab close)
  1005, // NO_STATUS_RECEIVED
  1006, // ABNORMAL_CLOSURE (network drop, server crash)
  4010, // MAY_TRY_RECONNECT (Colyseus-specific)
]; // https://kapeli.com/cheat_sheets/WebSocket_Status_Codes.docset/Contents/Resources/Documents/index
