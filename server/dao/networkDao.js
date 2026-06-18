import { all } from "../db/database.js";

export async function getNetwork() {
  const [lines, stations, memberships, segments] = await Promise.all([
    all(
      `SELECT id, name, color
       FROM lines
       ORDER BY id`,
    ),
    all(
      `SELECT id, name
       FROM stations
       ORDER BY id`,
    ),
    all(
      `SELECT
         ls.line_id AS lineId,
         ls.station_id AS stationId,
         ls.position
       FROM line_stations ls
       ORDER BY ls.line_id, ls.position`,
    ),
    all(
      `SELECT
         s.id,
         s.line_id AS lineId,
         s.station_a_id AS stationAId,
         s.station_b_id AS stationBId
       FROM segments s
       ORDER BY s.line_id, s.id`,
    ),
  ]);

  const lineCountByStationId = new Map();

  for (const membership of memberships) {
    const count = lineCountByStationId.get(membership.stationId) ?? 0;
    lineCountByStationId.set(membership.stationId, count + 1);
  }

  return {
    lines: lines.map((line) => ({
      id: line.id,
      name: line.name,
      color: line.color,
      stationIds: memberships
        .filter((membership) => membership.lineId === line.id)
        .map((membership) => membership.stationId),
    })),
    stations: stations.map((station) => ({
      id: station.id,
      name: station.name,
      isInterchange: (lineCountByStationId.get(station.id) ?? 0) > 1,
    })),
    segments: segments.map((segment) => ({
      id: segment.id,
      lineId: segment.lineId,
      stationAId: segment.stationAId,
      stationBId: segment.stationBId,
    })),
  };
}
