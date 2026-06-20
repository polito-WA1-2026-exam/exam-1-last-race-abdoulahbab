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
import { requireAuthenticatedUser } from "./middleware/auth.js";

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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error.",
  });
});

app.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});
