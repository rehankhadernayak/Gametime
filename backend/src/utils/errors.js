export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function assertOrThrow(condition, statusCode, message, details = null) {
  if (!condition) {
    throw new ApiError(statusCode, message, details);
  }
}
