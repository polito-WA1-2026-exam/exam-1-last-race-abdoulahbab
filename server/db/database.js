import path from "node:path";
import { fileURLToPath } from "node:url";

import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath =
  process.env.LAST_RACE_DB_PATH ?? path.join(__dirname, "last-race.sqlite");

const db = new sqlite3.Database(databasePath, (err) => {
  if (err) {
    console.error("Failed to open SQLite database:", err.message);
  }
});

db.run("PRAGMA foreign_keys = ON");

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

export async function withTransaction(work) {
  await run("BEGIN IMMEDIATE TRANSACTION");

  try {
    const result = await work();
    await run("COMMIT");
    return result;
  } catch (err) {
    await run("ROLLBACK").catch(() => {});
    throw err;
  }
}

export function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
