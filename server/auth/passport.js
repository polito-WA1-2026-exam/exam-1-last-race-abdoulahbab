import { Strategy as LocalStrategy } from "passport-local";

import {
  getSafeUserById,
  getUserForAuthentication,
} from "../dao/userDao.js";
import { verifyPassword } from "./password.js";

export function configurePassport(passport) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await getUserForAuthentication(username);

        if (!user) {
          return done(null, false, { message: "Invalid username or password." });
        }

        const validPassword = verifyPassword(
          password,
          user.salt,
          user.passwordHash,
        );

        if (!validPassword) {
          return done(null, false, { message: "Invalid username or password." });
        }

        return done(null, {
          id: user.id,
          username: user.username,
          name: user.name,
        });
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getSafeUserById(id);

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  });
}
