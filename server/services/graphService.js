export function buildAdjacency(segments) {
  const adjacency = new Map();

  for (const segment of segments) {
    addNeighbor(adjacency, segment.stationAId, segment.stationBId);
    addNeighbor(adjacency, segment.stationBId, segment.stationAId);
  }

  return adjacency;
}

export function shortestDistance(startStationId, destinationStationId, segments) {
  if (startStationId === destinationStationId) {
    return 0;
  }

  const adjacency = buildAdjacency(segments);
  const visited = new Set([startStationId]);
  const queue = [{ stationId: startStationId, distance: 0 }];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const neighbors = adjacency.get(current.stationId) ?? [];

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      const nextDistance = current.distance + 1;

      if (neighborId === destinationStationId) {
        return nextDistance;
      }

      visited.add(neighborId);
      queue.push({ stationId: neighborId, distance: nextDistance });
    }
  }

  return Infinity;
}

export function listEndpointPairs(stations, segments, minimumDistance) {
  const pairs = [];

  for (const start of stations) {
    for (const destination of stations) {
      if (start.id === destination.id) {
        continue;
      }

      const distance = shortestDistance(start.id, destination.id, segments);

      if (distance >= minimumDistance && Number.isFinite(distance)) {
        pairs.push({
          startStationId: start.id,
          destinationStationId: destination.id,
          distance,
        });
      }
    }
  }

  return pairs;
}

function addNeighbor(adjacency, fromStationId, toStationId) {
  if (!adjacency.has(fromStationId)) {
    adjacency.set(fromStationId, []);
  }

  adjacency.get(fromStationId).push(toStationId);
}
