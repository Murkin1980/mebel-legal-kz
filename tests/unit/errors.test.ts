import { describe, it, expect } from 'vitest';
import {
  AppError,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  tenantMismatch,
  invalidStateTransition,
  optimisticConcurrencyConflict,
  idempotencyConflict,
} from '@/modules/shared/errors';

describe('Errors', () => {
  describe('AppError', () => {
    it('should create error with code and message', () => {
      const error = new AppError('UNAUTHORIZED', 'Not authenticated', 401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Not authenticated');
      expect(error.statusCode).toBe(401);
    });

    it('should serialize to JSON without stack trace', () => {
      const error = new AppError('UNAUTHORIZED', 'Not authenticated', 401);
      const json = error.toJSON();
      expect(json.error.code).toBe('UNAUTHORIZED');
      expect(json.error.message).toBe('Not authenticated');
      expect(json).not.toHaveProperty('stack');
    });
  });

  describe('error factories', () => {
    it('unauthorized should create 401 error', () => {
      const error = unauthorized();
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });

    it('forbidden should create 403 error', () => {
      const error = forbidden();
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });

    it('notFound should create 404 error', () => {
      const error = notFound();
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('conflict should create 409 error', () => {
      const error = conflict('Duplicate');
      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
    });

    it('validationError should create 400 error', () => {
      const error = validationError('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('tenantMismatch should create 403 error', () => {
      const error = tenantMismatch();
      expect(error.code).toBe('TENANT_MISMATCH');
      expect(error.statusCode).toBe(403);
    });

    it('invalidStateTransition should create 400 error', () => {
      const error = invalidStateTransition('draft', 'approved');
      expect(error.code).toBe('INVALID_STATE_TRANSITION');
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('draft');
      expect(error.message).toContain('approved');
    });

    it('optimisticConcurrencyConflict should create 409 error', () => {
      const error = optimisticConcurrencyConflict();
      expect(error.code).toBe('OPTIMISTIC_CONCURRENCY_CONFLICT');
      expect(error.statusCode).toBe(409);
    });

    it('idempotencyConflict should create 409 error', () => {
      const error = idempotencyConflict();
      expect(error.code).toBe('IDEMPOTENCY_CONFLICT');
      expect(error.statusCode).toBe(409);
    });
  });
});
