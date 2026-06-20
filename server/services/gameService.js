import { withTransaction } from "../db/database.js";
import {
  completeGame,
  createGame,
  getGameById,
  insertGameStep,
  listEvents,
  listGameSteps,
  listRankings,
} from "../dao/gameDao.js";
import { getNetwork } from "../dao/networkDao.js";
import { conflict, forbidden, notFound } from "../errors.js";
import { listEndpointPairs } from "./graphService.js";
import { validateRoute } from "./routeValidationService.js";

const INITIAL_COINS = 20;
const PLANNING_SECONDS = 90;
const MINIMUM_ENDPOINT_DISTANCE = 3;

export async function createGameForUser(userId) {
  const network = await getNetwork();
  const endpointPair = chooseEndpointPair(network);
  const now = new Date();
  const planningDeadline = new Date(
    now.getTime() + PLANNING_SECONDS * 1000,
  ).toISOString();

  return createGame({
    userId,
    startStationId: endpointPair.startStationId,
    destinationStationId: endpointPair.destinationStationId,
    planningDeadline,
    createdAt: now.toISOString(),
  });
}

export async function getOwnedGame(userId, gameId) {
  const game = await getGameById(gameId);

  if (!game) {
    throw notFound("Game not found.");
  }

  if (game.userId !== userId) {
    throw forbidden("This game belongs to another user.");
  }

  return game;
}

export async function submitRouteForGame(userId, gameId, segmentIds) {
  return withTransaction(async () => {
    const game = await getOwnedGame(userId, gameId);

    if (game.status !== "PLANNING") {
      throw conflict("This game has already been completed.");
    }

    const network = await getNetwork();
    const validation = validateRoute({ game, network, segmentIds });
    const completedAt = new Date().toISOString();

    if (!validation.valid) {
      const completedGame = await completeGame({
        gameId,
        isSuccessful: false,
        finalScore: 0,
        completedAt,
      });

      return {
        game: completedGame,
        route: {
          valid: false,
          reasons: validation.reasons,
          steps: [],
        },
      };
    }

    const events = await listEvents();

    if (events.length === 0) {
      throw new Error("Cannot execute route without configured events.");
    }

    const steps = [];
    let coins = INITIAL_COINS;

    for (const [stepIndex, segment] of validation.orderedSegments.entries()) {
      const event = chooseEvent(events);
      const coinsBefore = coins;
      const coinsAfter = coinsBefore + event.effect;

      await insertGameStep({
        gameId,
        stepIndex,
        segmentId: segment.id,
        eventId: event.id,
        coinsBefore,
        coinsAfter,
      });

      steps.push({
        stepIndex,
        segmentId: segment.id,
        event,
        coinsBefore,
        coinsAfter,
      });

      coins = coinsAfter;
    }

    const completedGame = await completeGame({
      gameId,
      isSuccessful: true,
      finalScore: Math.max(0, coins),
      completedAt,
    });

    return {
      game: completedGame,
      route: {
        valid: true,
        reasons: [],
        steps,
      },
    };
  });
}

export async function getOwnedGameWithSteps(userId, gameId) {
  const game = await getOwnedGame(userId, gameId);
  const steps = await listGameSteps(gameId);

  return { game, steps };
}

export async function getRankings() {
  return listRankings();
}

function chooseEndpointPair(network) {
  const candidates = listEndpointPairs(
    network.stations,
    network.segments,
    MINIMUM_ENDPOINT_DISTANCE,
  );

  if (candidates.length === 0) {
    throw new Error("No valid start/destination pairs are available.");
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function chooseEvent(events) {
  return events[Math.floor(Math.random() * events.length)];
}

export const gameRules = {
  initialCoins: INITIAL_COINS,
  planningSeconds: PLANNING_SECONDS,
  minimumEndpointDistance: MINIMUM_ENDPOINT_DISTANCE,
};
