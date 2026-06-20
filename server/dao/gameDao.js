import { get, run } from "../db/database.js";

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
