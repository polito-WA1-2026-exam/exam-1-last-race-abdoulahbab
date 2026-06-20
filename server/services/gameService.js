import { createGame, getGameById } from "../dao/gameDao.js";
import { getNetwork } from "../dao/networkDao.js";
import { forbidden, notFound } from "../errors.js";
import { listEndpointPairs } from "./graphService.js";

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

export const gameRules = {
  initialCoins: INITIAL_COINS,
  planningSeconds: PLANNING_SECONDS,
  minimumEndpointDistance: MINIMUM_ENDPOINT_DISTANCE,
};
