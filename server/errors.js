export class AppError extends Error {
  constructor(status, error, message, details = []) {
    super(message);
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

export function badRequest(message, details = []) {
  return new AppError(400, "BAD_REQUEST", message, details);
}

export function forbidden(message = "You cannot access this resource.") {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found.") {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflict(message = "Request conflicts with current state.") {
  return new AppError(409, "CONFLICT", message);
}
