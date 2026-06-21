import { apiRequest } from "./apiClient";

export function login(username, password) {
  return apiRequest("/sessions", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getCurrentSession() {
  return apiRequest("/sessions/current");
}

export function logout() {
  return apiRequest("/sessions/current", {
    method: "DELETE",
  });
}
