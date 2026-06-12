export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code = "BAD_REQUEST") {
    super(400, message, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, code = "UNAUTHORIZED") {
    super(401, message, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, code = "FORBIDDEN") {
    super(403, message, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = "NOT_FOUND") {
    super(404, message, code);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, code = "CONFIGURATION_ERROR") {
    super(503, message, code);
  }
}
