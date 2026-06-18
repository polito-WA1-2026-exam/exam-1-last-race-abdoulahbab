import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = path.join(__dirname, "last-race.sqlite");
const schemaPath = path.join(__dirname, "schema.sql");

const lines = [
  { name: "Red Line", color: "#dc3545" },
  { name: "Blue Line", color: "#0d6efd" },
  { name: "Green Line", color: "#198754" },
  { name: "Yellow Line", color: "#ffc107" },
];

const lineMemberships = [
  {
    line: "Red Line",
    stations: [
      "Barriera di Milano",
      "Aurora",
      "Porta Palazzo",
      "Porta Susa",
      "Mirafiori",
    ],
  },
  {
    line: "Blue Line",
    stations: [
      "Rivoli",
      "Pozzo Strada",
      "Porta Susa",
      "Porta Nuova",
      "Piazza Castello",
      "Gran Madre",
    ],
  },
  {
    line: "Green Line",
    stations: [
      "Parco Dora",
      "Porta Nuova",
      "Valentino",
      "Villa della Regina",
      "Superga",
      "Parco della Pellerina",
    ],
  },
  {
    line: "Yellow Line",
    stations: [
      "Lingotto",
      "Mirafiori",
      "Valentino",
      "Piazza Castello",
      "Superga",
    ],
  },
];

const events = [
  {
    name: "Quiet Espresso Break",
    description: "A quick espresso near the station keeps you focused.",
    effect: 0,
  },
  {
    name: "Validated City Pass",
    description: "Your city pass is still valid and saves you a few coins.",
    effect: 2,
  },
  {
    name: "Tram Strike Delay",
    description: "A local transport strike slows down this connection.",
    effect: -2,
  },
  {
    name: "Nonna's Directions",
    description: "A local nonna points you toward the right platform.",
    effect: 1,
  },
  {
    name: "Wrong Binario",
    description: "You choose the wrong binario and lose time changing platform.",
    effect: -3,
  },
  {
    name: "Portici Shortcut",
    description: "You use the covered arcades to reach the next stop faster.",
    effect: 3,
  },
  {
    name: "Derby Crowd",
    description: "Football supporters crowd the train after the derby.",
    effect: -1,
  },
  {
    name: "ZTL Fine",
    description: "A careless transfer through a restricted area costs you coins.",
    effect: -4,
  },
  {
    name: "Bicerin Bonus",
    description: "A traditional bicerin gives you energy for the next segment.",
    effect: 4,
  },
];

const users = [
  { username: "abdo", name: "Abdo", password: "password" },
  { username: "bruno", name: "Bruno", password: "password" },
  { username: "carla", name: "Carla", password: "password" },
];

function openDatabase(filename) {
  return new sqlite3.Database(filename);
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function run(db, sql, params = []) {
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

function get(db, sql, params = []) {
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

function all(db, sql, params = []) {
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

function close(db) {
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

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = pbkdf2Sync(password, salt, 310000, 32, "sha256").toString(
    "hex",
  );

  return { salt, passwordHash };
}

function uniqueStationNames() {
  return [
    ...new Set(lineMemberships.flatMap((membership) => membership.stations)),
  ];
}

async function insertLines(db) {
  const lineIds = new Map();

  for (const line of lines) {
    const result = await run(
      db,
      "INSERT INTO lines (name, color) VALUES (?, ?)",
      [line.name, line.color],
    );
    lineIds.set(line.name, result.lastID);
  }

  return lineIds;
}

async function insertStations(db) {
  const stationIds = new Map();

  for (const stationName of uniqueStationNames()) {
    const result = await run(db, "INSERT INTO stations (name) VALUES (?)", [
      stationName,
    ]);
    stationIds.set(stationName, result.lastID);
  }

  return stationIds;
}

async function insertLineMemberships(db, lineIds, stationIds) {
  for (const membership of lineMemberships) {
    const lineId = lineIds.get(membership.line);

    for (const [index, stationName] of membership.stations.entries()) {
      await run(
        db,
        `INSERT INTO line_stations (line_id, station_id, position)
         VALUES (?, ?, ?)`,
        [lineId, stationIds.get(stationName), index + 1],
      );
    }
  }
}

async function insertSegments(db, lineIds, stationIds) {
  const segmentIds = new Map();

  for (const membership of lineMemberships) {
    const lineId = lineIds.get(membership.line);

    for (let i = 0; i < membership.stations.length - 1; i += 1) {
      const stationA = membership.stations[i];
      const stationB = membership.stations[i + 1];
      const result = await run(
        db,
        `INSERT INTO segments (line_id, station_a_id, station_b_id)
         VALUES (?, ?, ?)`,
        [lineId, stationIds.get(stationA), stationIds.get(stationB)],
      );
      segmentIds.set(`${membership.line}:${stationA}:${stationB}`, result.lastID);
    }
  }

  return segmentIds;
}

async function insertEvents(db) {
  const eventIds = new Map();

  for (const event of events) {
    const result = await run(
      db,
      `INSERT INTO events (name, description, effect)
       VALUES (?, ?, ?)`,
      [event.name, event.description, event.effect],
    );
    eventIds.set(event.name, result.lastID);
  }

  return eventIds;
}

async function insertUsers(db) {
  const userIds = new Map();

  for (const user of users) {
    const { salt, passwordHash } = hashPassword(user.password);
    const result = await run(
      db,
      `INSERT INTO users (username, name, password_hash, salt)
       VALUES (?, ?, ?, ?)`,
      [user.username, user.name, passwordHash, salt],
    );
    userIds.set(user.username, result.lastID);
  }

  return userIds;
}

async function insertCompletedGame(
  db,
  { userId, startStationId, destinationStationId, finalScore, steps },
) {
  const now = new Date().toISOString();
  const result = await run(
    db,
    `INSERT INTO games (
       user_id,
       start_station_id,
       destination_station_id,
       initial_coins,
       planning_deadline,
       status,
       is_successful,
       final_score,
       created_at,
       completed_at
     )
     VALUES (?, ?, ?, 20, ?, 'COMPLETED', 1, ?, ?, ?)`,
    [userId, startStationId, destinationStationId, now, finalScore, now, now],
  );

  const gameId = result.lastID;
  let coins = 20;

  for (const [index, step] of steps.entries()) {
    const coinsBefore = coins;
    coins += step.effect;
    await run(
      db,
      `INSERT INTO game_steps (
         game_id,
         step_index,
         segment_id,
         event_id,
         coins_before,
         coins_after
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [gameId, index, step.segmentId, step.eventId, coinsBefore, coins],
    );
  }
}

async function insertSeedGames(db, userIds, stationIds, segmentIds, eventIds) {
  await insertCompletedGame(db, {
    userId: userIds.get("abdo"),
    startStationId: stationIds.get("Barriera di Milano"),
    destinationStationId: stationIds.get("Gran Madre"),
    finalScore: 24,
    steps: [
      {
        segmentId: segmentIds.get("Red Line:Barriera di Milano:Aurora"),
        eventId: eventIds.get("Nonna's Directions"),
        effect: 1,
      },
      {
        segmentId: segmentIds.get("Red Line:Aurora:Porta Palazzo"),
        eventId: eventIds.get("Quiet Espresso Break"),
        effect: 0,
      },
      {
        segmentId: segmentIds.get("Red Line:Porta Palazzo:Porta Susa"),
        eventId: eventIds.get("Portici Shortcut"),
        effect: 3,
      },
      {
        segmentId: segmentIds.get("Blue Line:Porta Susa:Porta Nuova"),
        eventId: eventIds.get("Tram Strike Delay"),
        effect: -2,
      },
      {
        segmentId: segmentIds.get("Blue Line:Porta Nuova:Piazza Castello"),
        eventId: eventIds.get("Validated City Pass"),
        effect: 2,
      },
      {
        segmentId: segmentIds.get("Blue Line:Piazza Castello:Gran Madre"),
        eventId: eventIds.get("Quiet Espresso Break"),
        effect: 0,
      },
    ],
  });

  await insertCompletedGame(db, {
    userId: userIds.get("bruno"),
    startStationId: stationIds.get("Lingotto"),
    destinationStationId: stationIds.get("Parco della Pellerina"),
    finalScore: 19,
    steps: [
      {
        segmentId: segmentIds.get("Yellow Line:Lingotto:Mirafiori"),
        eventId: eventIds.get("Derby Crowd"),
        effect: -1,
      },
      {
        segmentId: segmentIds.get("Yellow Line:Mirafiori:Valentino"),
        eventId: eventIds.get("Wrong Binario"),
        effect: -3,
      },
      {
        segmentId: segmentIds.get("Green Line:Valentino:Villa della Regina"),
        eventId: eventIds.get("Bicerin Bonus"),
        effect: 4,
      },
      {
        segmentId: segmentIds.get("Green Line:Villa della Regina:Superga"),
        eventId: eventIds.get("Tram Strike Delay"),
        effect: -2,
      },
      {
        segmentId: segmentIds.get(
          "Green Line:Superga:Parco della Pellerina",
        ),
        eventId: eventIds.get("Nonna's Directions"),
        effect: 1,
      },
    ],
  });
}

async function validateSeed(db) {
  const counts = await get(
    db,
    `SELECT
       (SELECT COUNT(*) FROM lines) AS lines,
       (SELECT COUNT(*) FROM stations) AS stations,
       (SELECT COUNT(*) FROM events) AS events,
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM games WHERE status = 'COMPLETED' AND is_successful = 1) AS successfulGames`,
  );

  const interchangeRows = await all(
    db,
    `SELECT s.name, COUNT(DISTINCT ls.line_id) AS line_count
     FROM stations s
     JOIN line_stations ls ON ls.station_id = s.id
     GROUP BY s.id, s.name
     HAVING COUNT(DISTINCT ls.line_id) > 1
     ORDER BY s.name`,
  );

  if (counts.lines < 4) {
    throw new Error("Seed validation failed: fewer than 4 lines.");
  }
  if (counts.stations < 12) {
    throw new Error("Seed validation failed: fewer than 12 stations.");
  }
  if (counts.events < 8) {
    throw new Error("Seed validation failed: fewer than 8 events.");
  }
  if (counts.users < 3) {
    throw new Error("Seed validation failed: fewer than 3 users.");
  }
  if (interchangeRows.length < 3) {
    throw new Error("Seed validation failed: fewer than 3 interchanges.");
  }
  if (interchangeRows.length > counts.stations / 2) {
    throw new Error("Seed validation failed: too many interchanges.");
  }
  if (counts.successfulGames < 2) {
    throw new Error("Seed validation failed: fewer than 2 successful games.");
  }

  console.log("Seed validation passed.");
  console.table(counts);
  console.table(interchangeRows);
}

async function main() {
  await unlink(databasePath).catch((err) => {
    if (err.code !== "ENOENT") {
      throw err;
    }
  });

  const schema = await readFile(schemaPath, "utf8");
  const db = openDatabase(databasePath);

  try {
    await exec(db, "PRAGMA foreign_keys = ON;");
    await exec(db, schema);
    await exec(db, "BEGIN TRANSACTION;");

    const lineIds = await insertLines(db);
    const stationIds = await insertStations(db);
    await insertLineMemberships(db, lineIds, stationIds);
    const segmentIds = await insertSegments(db, lineIds, stationIds);
    const eventIds = await insertEvents(db);
    const userIds = await insertUsers(db);
    await insertSeedGames(db, userIds, stationIds, segmentIds, eventIds);

    await exec(db, "COMMIT;");
    await validateSeed(db);
    console.log(`Database seeded at ${databasePath}`);
  } catch (err) {
    await exec(db, "ROLLBACK;").catch(() => {});
    throw err;
  } finally {
    await close(db);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
