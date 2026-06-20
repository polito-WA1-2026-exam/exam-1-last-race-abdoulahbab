import express from "express";
import session from "express-session";
import cors from "cors";
import passport from "passport";

import {
  clientOrigin,
  serverPort,
  sessionCookieName,
  sessionSecret,
} from "./config.js";
import { configurePassport } from "./auth/passport.js";
import { getNetwork } from "./dao/networkDao.js";
import { badRequest } from "./errors.js";
import { requireAuthenticatedUser } from "./middleware/auth.js";
import {
  createGameForUser,
  getOwnedGameWithSteps,
  getRankings,
  submitRouteForGame,
} from "./services/gameService.js";

const app = express();

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  session({
    name: sessionCookieName,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    },
  }),
);

configurePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

app.post("/api/sessions", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: info?.message ?? "Invalid username or password.",
      });
    }

    return req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      return res.status(201).json({ user });
    });
  })(req, res, next);
});

app.get("/api/sessions/current", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: "AUTHENTICATION_REQUIRED",
      message: "No authenticated user.",
    });
  }

  return res.json({ user: req.user });
});

app.delete("/api/sessions/current", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    return req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return next(destroyErr);
      }

      res.clearCookie(sessionCookieName);
      return res.status(204).end();
    });
  });
});

app.get("/api/network", requireAuthenticatedUser, async (req, res, next) => {
  try {
    const network = await getNetwork();
    res.json(network);
  } catch (err) {
    next(err);
  }
});

app.post("/api/games", requireAuthenticatedUser, async (req, res, next) => {
  try {
    const game = await createGameForUser(req.user.id);
    res.status(201).json({ game });
  } catch (err) {
    next(err);
  }
});

app.get(
  "/api/games/:gameId",
  requireAuthenticatedUser,
  async (req, res, next) => {
    const gameId = Number(req.params.gameId);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return next(badRequest("Game ID must be a positive integer."));
    }

    try {
      const gameResult = await getOwnedGameWithSteps(req.user.id, gameId);
      return res.json(gameResult);
    } catch (err) {
      return next(err);
    }
  },
);

app.post(
  "/api/games/:gameId/route",
  requireAuthenticatedUser,
  async (req, res, next) => {
    const gameId = Number(req.params.gameId);

    if (!Number.isInteger(gameId) || gameId <= 0) {
      return next(badRequest("Game ID must be a positive integer."));
    }

    const { segmentIds } = req.body ?? {};

    if (
      !Array.isArray(segmentIds) ||
      !segmentIds.every(
        (segmentId) => Number.isInteger(segmentId) && segmentId > 0,
      )
    ) {
      return next(badRequest("segmentIds must be an array of positive integers."));
    }

    try {
      const result = await submitRouteForGame(req.user.id, gameId, segmentIds);
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  },
);

app.get("/api/rankings", requireAuthenticatedUser, async (req, res, next) => {
  try {
    const rankings = await getRankings();
    return res.json({ rankings });
  } catch (err) {
    return next(err);
  }
});

app.use((err, req, res, next) => {
  const status = err.status ?? 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: err.error ?? "INTERNAL_SERVER_ERROR",
    message: err.status ? err.message : "Unexpected server error.",
    details: err.details ?? [],
  });
});

app.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});
