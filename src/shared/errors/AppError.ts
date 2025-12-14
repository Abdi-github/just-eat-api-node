/**
 * Custom Application Error class
 * Extends the built-in Error class with additional properties for HTTP error handling
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly code?: number | string;
  public readonly errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    codeOrErrors?: number | string | Array<{ field?: string; message: string }>
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Handle error code (number/string) and validation errors (array)
    if (typeof codeOrErrors === 'number' || typeof codeOrErrors === 'string') {
      this.code = codeOrErrors;
    } else if (Array.isArray(codeOrErrors)) {
      this.errors = codeOrErrors;
    }

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Type guard to check if error is an AppError
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

// Common HTTP error factory functions
export const BadRequestError = (
  message = 'Bad Request',
  errorsOrCode?: number | Array<{ field?: string; message: string }>
): AppError => new AppError(message, 400, errorsOrCode);

export const UnauthorizedError = (message = 'Unauthorized', code?: number): AppError =>
  new AppError(message, 401, code);

export const ForbiddenError = (message = 'Forbidden', code?: number): AppError =>
  new AppError(message, 403, code);

export const NotFoundError = (message = 'Resource not found', code?: number): AppError =>
  new AppError(message, 404, code);

export const ConflictError = (message = 'Conflict', code?: number): AppError =>
  new AppError(message, 409, code);

export const ValidationError = (errors: Array<{ field?: string; message: string }>): AppError =>
  new AppError('Validation Error', 422, errors);

export const TooManyRequestsError = (message = 'Too many requests', code?: number): AppError =>
  new AppError(message, 429, code);

export const InternalServerError = (message = 'Internal Server Error', code?: number): AppError =>
  new AppError(message, 500, code);

export default AppError;
