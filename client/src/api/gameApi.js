import { apiRequest } from "./apiClient";

export function getNetwork() {
  return apiRequest("/network");
}

export function createGame() {
  return apiRequest("/games", {
    method: "POST",
  });
}

export function getGame(gameId) {
  return apiRequest(`/games/${gameId}`);
}

export function submitRoute(gameId, segmentIds) {
  return apiRequest(`/games/${gameId}/route`, {
    method: "POST",
    body: JSON.stringify({ segmentIds }),
  });
}

export function getRankings() {
  return apiRequest("/rankings");
}
