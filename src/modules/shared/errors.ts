/**
 * Standardized error types for MebelLegal KZ.
 *
 * All errors are serialized to client without stack traces or PII.
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TENANT_MISMATCH'
  | 'INVALID_STATE_TRANSITION'
  | 'OPTIMISTIC_CONCURRENCY_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PRECONDITION_FAILED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError('UNAUTHORIZED', message, 401);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError('FORBIDDEN', message, 403);
}

export function notFound(message = 'Not found'): AppError {
  return new AppError('NOT_FOUND', message, 404);
}

export function conflict(message: string): AppError {
  return new AppError('CONFLICT', message, 409);
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('VALIDATION_ERROR', message, 400, details);
}

export function tenantMismatch(): AppError {
  return new AppError('TENANT_MISMATCH', 'Access denied: tenant mismatch', 403);
}

export function invalidStateTransition(from: string, to: string): AppError {
  return new AppError(
    'INVALID_STATE_TRANSITION',
    `Invalid state transition: ${from} → ${to}`,
    400
  );
}

export function optimisticConcurrencyConflict(): AppError {
  return new AppError(
    'OPTIMISTIC_CONCURRENCY_CONFLICT',
    'Conflict: record was modified by another request',
    409
  );
}

export function idempotencyConflict(): AppError {
  return new AppError(
    'IDEMPOTENCY_CONFLICT',
    'Conflict: idempotency key already used',
    409
  );
}

export function internalError(message = 'Internal error'): AppError {
  return new AppError('INTERNAL_ERROR', message, 500);
}

export function preconditionFailed(message: string): AppError {
  return new AppError('PRECONDITION_FAILED', message, 412);
}
