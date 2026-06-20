export function validateRoute({ game, network, segmentIds, now = new Date() }) {
  const reasons = [];

  if (new Date(game.planningDeadline).getTime() < now.getTime()) {
    reasons.push("Planning deadline expired.");
  }

  if (segmentIds.length === 0) {
    reasons.push("Route is empty.");
    return invalid(reasons);
  }

  const segmentsById = new Map(
    network.segments.map((segment) => [segment.id, segment]),
  );
  const interchanges = new Set(
    network.stations
      .filter((station) => station.isInterchange)
      .map((station) => station.id),
  );
  const usedSegmentIds = new Set();
  const orderedSegments = [];
  let currentStationId = game.startStationId;
  let previousLineId;

  for (const segmentId of segmentIds) {
    const segment = segmentsById.get(segmentId);

    if (!segment) {
      reasons.push(`Segment ${segmentId} does not exist.`);
      return invalid(reasons);
    }

    if (usedSegmentIds.has(segmentId)) {
      reasons.push(`Segment ${segmentId} is used more than once.`);
      return invalid(reasons);
    }

    if (!segmentTouchesStation(segment, currentStationId)) {
      reasons.push(`Segment ${segmentId} is not connected to the current route.`);
      return invalid(reasons);
    }

    if (
      previousLineId !== undefined &&
      previousLineId !== segment.lineId &&
      !interchanges.has(currentStationId)
    ) {
      reasons.push("Line change is allowed only at interchange stations.");
      return invalid(reasons);
    }

    usedSegmentIds.add(segmentId);
    orderedSegments.push(segment);
    currentStationId = otherStationId(segment, currentStationId);
    previousLineId = segment.lineId;
  }

  if (currentStationId !== game.destinationStationId) {
    reasons.push("Route does not reach the destination.");
  }

  if (reasons.length > 0) {
    return invalid(reasons);
  }

  return {
    valid: true,
    reasons: [],
    orderedSegments,
    finalStationId: currentStationId,
  };
}

function invalid(reasons) {
  return {
    valid: false,
    reasons,
    orderedSegments: [],
  };
}

function segmentTouchesStation(segment, stationId) {
  return segment.stationAId === stationId || segment.stationBId === stationId;
}

function otherStationId(segment, stationId) {
  if (segment.stationAId === stationId) {
    return segment.stationBId;
  }

  return segment.stationAId;
}
