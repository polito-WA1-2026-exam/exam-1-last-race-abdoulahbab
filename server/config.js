export const serverPort = 3001;
export const clientOrigin = "http://localhost:5173";

// For the exam project, this fallback keeps local startup simple.
// In production, SESSION_SECRET should always come from the environment.
export const sessionSecret =
  process.env.SESSION_SECRET ?? "last-race-local-development-secret";

export const sessionCookieName = "lastRace.sid";
