import { all, get, run } from "../db/database.js";

function mapGame(row) {
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    userId: row.userId,
    startStationId: row.startStationId,
    destinationStationId: row.destinationStationId,
    initialCoins: row.initialCoins,
    planningDeadline: row.planningDeadline,
    status: row.status,
    isSuccessful: Boolean(row.isSuccessful),
    finalScore: row.finalScore,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

function mapGameStep(row) {
  return {
    id: row.id,
    gameId: row.gameId,
    stepIndex: row.stepIndex,
    segmentId: row.segmentId,
    event: row.eventId
      ? {
          id: row.eventId,
          name: row.eventName,
          description: row.eventDescription,
          effect: row.eventEffect,
        }
      : null,
    coinsBefore: row.coinsBefore,
    coinsAfter: row.coinsAfter,
  };
}

export async function createGame({
  userId,
  startStationId,
  destinationStationId,
  planningDeadline,
  createdAt,
}) {
  const result = await run(
    `
      INSERT INTO games (
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
      VALUES (?, ?, ?, 20, ?, 'PLANNING', 0, NULL, ?, NULL)
    `,
    [userId, startStationId, destinationStationId, planningDeadline, createdAt],
  );

  return getGameById(result.lastID);
}

export async function getGameById(gameId) {
  const row = await get(
    `
      SELECT
        id,
        user_id AS userId,
        start_station_id AS startStationId,
        destination_station_id AS destinationStationId,
        initial_coins AS initialCoins,
        planning_deadline AS planningDeadline,
        status,
        is_successful AS isSuccessful,
        final_score AS finalScore,
        created_at AS createdAt,
        completed_at AS completedAt
      FROM games
      WHERE id = ?
    `,
    [gameId],
  );

  return mapGame(row);
}

export async function listEvents() {
  return all(`
    SELECT id, name, description, effect
    FROM events
    ORDER BY id
  `);
}

export async function insertGameStep({
  gameId,
  stepIndex,
  segmentId,
  eventId,
  coinsBefore,
  coinsAfter,
}) {
  await run(
    `
      INSERT INTO game_steps (
        game_id,
        step_index,
        segment_id,
        event_id,
        coins_before,
        coins_after
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [gameId, stepIndex, segmentId, eventId, coinsBefore, coinsAfter],
  );
}

export async function completeGame({
  gameId,
  isSuccessful,
  finalScore,
  completedAt,
}) {
  await run(
    `
      UPDATE games
      SET
        status = 'COMPLETED',
        is_successful = ?,
        final_score = ?,
        completed_at = ?
      WHERE id = ?
    `,
    [isSuccessful ? 1 : 0, finalScore, completedAt, gameId],
  );

  return getGameById(gameId);
}

export async function listGameSteps(gameId) {
  const rows = await all(
    `
      SELECT
        gs.id,
        gs.game_id AS gameId,
        gs.step_index AS stepIndex,
        gs.segment_id AS segmentId,
        gs.event_id AS eventId,
        gs.coins_before AS coinsBefore,
        gs.coins_after AS coinsAfter,
        e.name AS eventName,
        e.description AS eventDescription,
        e.effect AS eventEffect
      FROM game_steps gs
      LEFT JOIN events e ON e.id = gs.event_id
      WHERE gs.game_id = ?
      ORDER BY gs.step_index
    `,
    [gameId],
  );

  return rows.map(mapGameStep);
}

export async function listRankings() {
  return all(`
    SELECT
      u.id AS userId,
      u.username,
      u.name,
      MAX(g.final_score) AS score
    FROM users u
    JOIN games g ON g.user_id = u.id
    WHERE g.status = 'COMPLETED'
      AND g.is_successful = 1
      AND g.final_score IS NOT NULL
    GROUP BY u.id, u.username, u.name
    ORDER BY score DESC, u.username ASC
  `);
}
