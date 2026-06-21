const API_BASE_URL = "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.message ?? "Unexpected API error.");
    this.status = status;
    this.error = payload?.error ?? "API_ERROR";
    this.details = payload?.details ?? [];
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return undefined;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload;
}
