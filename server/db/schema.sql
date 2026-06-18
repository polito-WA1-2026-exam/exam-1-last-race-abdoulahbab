PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS game_steps;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS segments;
DROP TABLE IF EXISTS line_stations;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS lines;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL
);

CREATE TABLE lines (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE stations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE line_stations (
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  PRIMARY KEY (line_id, station_id),
  UNIQUE (line_id, position)
);

CREATE TABLE segments (
  id INTEGER PRIMARY KEY,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  station_a_id INTEGER NOT NULL REFERENCES stations(id),
  station_b_id INTEGER NOT NULL REFERENCES stations(id),
  CHECK (station_a_id <> station_b_id)
);

CREATE UNIQUE INDEX idx_segments_unique_undirected
ON segments (
  line_id,
  MIN(station_a_id, station_b_id),
  MAX(station_a_id, station_b_id)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  effect INTEGER NOT NULL CHECK (effect BETWEEN -4 AND 4)
);

CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_station_id INTEGER NOT NULL REFERENCES stations(id),
  destination_station_id INTEGER NOT NULL REFERENCES stations(id),
  initial_coins INTEGER NOT NULL DEFAULT 20 CHECK (initial_coins = 20),
  planning_deadline TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PLANNING', 'COMPLETED')),
  is_successful INTEGER NOT NULL DEFAULT 0 CHECK (is_successful IN (0, 1)),
  final_score INTEGER CHECK (final_score IS NULL OR final_score >= 0),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  CHECK (start_station_id <> destination_station_id)
);

CREATE TABLE game_steps (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL CHECK (step_index >= 0),
  segment_id INTEGER NOT NULL REFERENCES segments(id),
  event_id INTEGER REFERENCES events(id),
  coins_before INTEGER,
  coins_after INTEGER,
  UNIQUE (game_id, step_index),
  UNIQUE (game_id, segment_id),
  CHECK (
    (event_id IS NULL AND coins_before IS NULL AND coins_after IS NULL)
    OR
    (event_id IS NOT NULL AND coins_before IS NOT NULL AND coins_after IS NOT NULL)
  )
);
