import { useEffect, useMemo, useState } from "react";

import { createGame, getNetwork, submitRoute } from "../api/gameApi";
import ErrorMessage from "../components/ErrorMessage";

export default function GamePage() {
  const [network, setNetwork] = useState(null);
  const [game, setGame] = useState(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    async function loadGameData() {
      try {
        const networkData = await getNetwork();

        if (active) {
          setNetwork(networkData);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadGameData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const routeState = useMemo(() => {
    if (!network || !game) {
      return {
        selectedSegments: [],
        currentStationId: undefined,
        availableSegments: [],
        usedSegmentIds: new Set(),
        reachedDestination: false,
      };
    }

    return deriveRouteState(network, game, selectedSegmentIds);
  }, [network, game, selectedSegmentIds]);

  const remainingSeconds = useMemo(() => {
    if (!game) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil((new Date(game.planningDeadline).getTime() - now) / 1000),
    );
  }, [game, now]);

  const planningOpen =
    game?.status === "PLANNING" && !routeResult && remainingSeconds > 0;

  async function handleNewGame() {
    setLoading(true);
    setError("");

    try {
      const gameData = await createGame();
      setGame(gameData.game);
      setSelectedSegmentIds([]);
      setRouteResult(null);
      setNow(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSegment(segmentId) {
    if (!planningOpen) {
      return;
    }

    setSelectedSegmentIds((previous) => [...previous, segmentId]);
  }

  function handleUndo() {
    setSelectedSegmentIds((previous) => previous.slice(0, -1));
  }

  async function handleSubmitRoute() {
    if (!game) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await submitRoute(game.id, selectedSegmentIds);
      setGame(result.game);
      setRouteResult(result.route);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="status-card">Loading game...</p>;
  }

  return (
    <section className="page game-page">
      <div className="game-header card">
        <div>
          <p className="eyebrow">Planning phase</p>
          <h2>Build a route before the deadline</h2>
        </div>
        <button type="button" className="button secondary" onClick={handleNewGame}>
          New game
        </button>
      </div>
      <ErrorMessage message={error} />
      {network && !game && (
        <div className="card">
          <p className="eyebrow">Server-controlled setup</p>
          <h2>No active game yet</h2>
          <p>
            Click New game to ask the server for start and destination stations.
            This avoids accidental duplicate game creation in React Strict Mode.
          </p>
          <div className="actions">
            <button type="button" className="button primary" onClick={handleNewGame}>
              New game
            </button>
          </div>
        </div>
      )}
      {network && game && (
        <div className="game-grid">
          <NetworkPanel
            game={game}
            network={network}
            routeState={routeState}
            planningOpen={planningOpen}
            onSelectSegment={handleSelectSegment}
          />
          <PlanningPanel
            game={game}
            network={network}
            routeState={routeState}
            selectedSegmentIds={selectedSegmentIds}
            remainingSeconds={remainingSeconds}
            routeResult={routeResult}
            planningOpen={planningOpen}
            submitting={submitting}
            onUndo={handleUndo}
            onSubmitRoute={handleSubmitRoute}
            onNewGame={handleNewGame}
          />
        </div>
      )}
    </section>
  );
}

function NetworkPanel({ game, network, routeState, planningOpen, onSelectSegment }) {
  const stationById = useMemo(() => mapById(network.stations), [network.stations]);
  const lineById = useMemo(() => mapById(network.lines), [network.lines]);

  return (
    <div className="card">
      <p className="eyebrow">Network</p>
      <div className="line-list">
        {network.lines.map((line) => (
          <div key={line.id} className="line-card">
            <h3 style={{ borderColor: line.color }}>{line.name}</h3>
            <div className="station-chain">
              {line.stationIds.map((stationId) => {
                const station = stationById.get(stationId);
                const isStart = stationId === game.startStationId;
                const isDestination = stationId === game.destinationStationId;
                const isCurrent = stationId === routeState.currentStationId;

                return (
                  <span
                    key={stationId}
                    className={[
                      "station-pill",
                      station.isInterchange ? "interchange" : "",
                      isStart ? "start" : "",
                      isDestination ? "destination" : "",
                      isCurrent ? "current" : "",
                    ].join(" ")}
                  >
                    {station.name}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="available-segments">
        <h3>Available next segments</h3>
        {!planningOpen && <p className="muted">Planning is closed.</p>}
        {planningOpen && routeState.availableSegments.length === 0 && (
          <p className="muted">No available segment from current station.</p>
        )}
        {planningOpen &&
          routeState.availableSegments.map((segment) => {
            const stationA = stationById.get(segment.stationAId);
            const stationB = stationById.get(segment.stationBId);
            const line = lineById.get(segment.lineId);

            return (
              <button
                key={segment.id}
                type="button"
                className="segment-button"
                onClick={() => onSelectSegment(segment.id)}
              >
                <span style={{ backgroundColor: line.color }} />
                {stationA.name} - {stationB.name}
              </button>
            );
          })}
      </div>
    </div>
  );
}

function PlanningPanel({
  game,
  network,
  routeState,
  selectedSegmentIds,
  remainingSeconds,
  routeResult,
  planningOpen,
  submitting,
  onUndo,
  onSubmitRoute,
  onNewGame,
}) {
  const stationById = useMemo(() => mapById(network.stations), [network.stations]);
  const segmentById = useMemo(() => mapById(network.segments), [network.segments]);
  const lineById = useMemo(() => mapById(network.lines), [network.lines]);

  return (
    <aside className="card planning-panel">
      <p className="eyebrow">Game #{game.id}</p>
      <dl className="game-facts">
        <div>
          <dt>Start</dt>
          <dd>{stationById.get(game.startStationId)?.name}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{stationById.get(game.destinationStationId)?.name}</dd>
        </div>
        <div>
          <dt>Coins</dt>
          <dd>{game.finalScore ?? game.initialCoins}</dd>
        </div>
        <div>
          <dt>Timer</dt>
          <dd>{remainingSeconds}s</dd>
        </div>
      </dl>

      <h3>Selected route</h3>
      {selectedSegmentIds.length === 0 && <p className="muted">No segment selected yet.</p>}
      <ol className="route-list">
        {selectedSegmentIds.map((segmentId) => {
          const segment = segmentById.get(segmentId);
          const line = lineById.get(segment.lineId);

          return (
            <li key={segmentId}>
              <span style={{ backgroundColor: line.color }} />
              {stationById.get(segment.stationAId).name} -{" "}
              {stationById.get(segment.stationBId).name}
            </li>
          );
        })}
      </ol>

      <div className="actions">
        <button
          type="button"
          className="button secondary"
          disabled={selectedSegmentIds.length === 0 || !planningOpen}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="button primary"
          disabled={submitting || !planningOpen || selectedSegmentIds.length === 0}
          onClick={onSubmitRoute}
        >
          {submitting ? "Submitting..." : "Submit route"}
        </button>
      </div>

      {routeState.reachedDestination && !routeResult && (
        <p className="success-message">Destination reached. Submit the route.</p>
      )}
      {!planningOpen && !routeResult && game.status === "PLANNING" && (
        <p className="error-message">Planning deadline expired. Submit to finalize score zero.</p>
      )}
      {routeResult && (
        <ResultPanel routeResult={routeResult} game={game} onNewGame={onNewGame} />
      )}
    </aside>
  );
}

function ResultPanel({ routeResult, game, onNewGame }) {
  return (
    <div className="result-panel">
      <h3>Result</h3>
      <p className={routeResult.valid ? "success-message" : "error-message"}>
        {routeResult.valid ? "Route executed successfully." : "Route invalid."}
      </p>
      {!routeResult.valid && (
        <ul>
          {routeResult.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {routeResult.steps.length > 0 && (
        <ol className="event-list">
          {routeResult.steps.map((step) => (
            <li key={step.stepIndex}>
              <strong>{step.event.name}</strong>: {step.event.effect >= 0 ? "+" : ""}
              {step.event.effect} coins ({step.coinsBefore} {"->"} {step.coinsAfter})
            </li>
          ))}
        </ol>
      )}
      <p className="score">Final score: {game.finalScore}</p>
      <button type="button" className="button primary" onClick={onNewGame}>
        Play again
      </button>
    </div>
  );
}

function deriveRouteState(network, game, selectedSegmentIds) {
  const segmentById = mapById(network.segments);
  const interchanges = new Set(
    network.stations
      .filter((station) => station.isInterchange)
      .map((station) => station.id),
  );
  const selectedSegments = [];
  const usedSegmentIds = new Set();
  let currentStationId = game.startStationId;
  let previousLineId;

  for (const segmentId of selectedSegmentIds) {
    const segment = segmentById.get(segmentId);

    if (!segment || !segmentTouchesStation(segment, currentStationId)) {
      break;
    }

    selectedSegments.push(segment);
    usedSegmentIds.add(segment.id);
    currentStationId = otherStationId(segment, currentStationId);
    previousLineId = segment.lineId;
  }

  const availableSegments = network.segments.filter((segment) => {
    if (usedSegmentIds.has(segment.id)) {
      return false;
    }

    if (!segmentTouchesStation(segment, currentStationId)) {
      return false;
    }

    if (
      previousLineId !== undefined &&
      previousLineId !== segment.lineId &&
      !interchanges.has(currentStationId)
    ) {
      return false;
    }

    return true;
  });

  return {
    selectedSegments,
    currentStationId,
    availableSegments,
    usedSegmentIds,
    reachedDestination: currentStationId === game.destinationStationId,
  };
}

function mapById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function segmentTouchesStation(segment, stationId) {
  return segment.stationAId === stationId || segment.stationBId === stationId;
}

function otherStationId(segment, stationId) {
  return segment.stationAId === stationId ? segment.stationBId : segment.stationAId;
}
