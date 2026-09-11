import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { errorMiddleware } from './error.middleware.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { Request, Response } from 'express';

function createMockReqRes(): {
  req: Request;
  res: Response;
  getStatus: () => number;
  getBody: () => unknown;
} {
  let status = 200;
  let body: unknown = null;

  const req = {
    id: 'req-test-uuid',
    originalUrl: '/test',
    method: 'GET',
  } as unknown as Request;

  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as unknown as Response;

  return {
    req,
    res,
    getStatus: () => status,
    getBody: () => body,
  };
}

describe('Error Middleware', () => {
  it('maps ZodError to 422 VALIDATION_ERROR with field details', () => {
    const { req, res, getStatus, getBody } = createMockReqRes();

    const schema = z.object({
      email: z.string().email(),
    });

    let zodErr: unknown;
    try {
      schema.parse({ email: 'invalid' });
    } catch (e) {
      zodErr = e;
    }

    errorMiddleware(zodErr, req, res, () => {});

    assert.equal(getStatus(), 422);
    const body = getBody() as { success: boolean; error: { code: string; details: unknown } };
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.error.details));
  });

  it('maps AppError subclasses to their defined status codes and codes', () => {
    const { req, res, getStatus, getBody } = createMockReqRes();

    const notFound = new NotFoundError('CUSTOMER_NOT_FOUND', 'Customer not found');
    errorMiddleware(notFound, req, res, () => {});

    assert.equal(getStatus(), 404);
    assert.deepEqual(getBody(), {
      success: false,
      data: null,
      error: {
        code: 'CUSTOMER_NOT_FOUND',
        message: 'Customer not found',
        details: null,
      },
    });
  });

  it('maps PostgreSQL 23505 unique constraint violation to 409 DATABASE_CONFLICT', () => {
    const { req, res, getStatus, getBody } = createMockReqRes();

    const pgUniqueError = {
      code: '23505',
      detail: 'Key (ma_don_ban)=(DBH-001) already exists.',
    };

    errorMiddleware(pgUniqueError, req, res, () => {});

    assert.equal(getStatus(), 409);
    assert.deepEqual(getBody(), {
      success: false,
      data: null,
      error: {
        code: 'DATABASE_CONFLICT',
        message: 'Operation conflicted with existing data or concurrent modification.',
        details: null,
      },
    });
  });

  it('maps unexpected internal errors to safe 500 INTERNAL_SERVER_ERROR without leaking secrets or stack trace', () => {
    const { req, res, getStatus, getBody } = createMockReqRes();

    const originalConsoleError = console.error;
    const loggedMessages: string[] = [];
    console.error = (...args: unknown[]) => {
      loggedMessages.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    try {
      const secretError = new Error('Database password was incorrect for user secret_user');
      errorMiddleware(secretError, req, res, () => {});

      assert.equal(getStatus(), 500);
      assert.deepEqual(getBody(), {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected internal server error occurred.',
          details: null,
        },
      });

      // Verify that sensitive credentials and usernames are redacted in log output
      const fullLog = loggedMessages.join(' ');
      assert.ok(!fullLog.includes('secret_user'), 'Logged output must not contain sensitive username secret_user');
      assert.ok(!fullLog.includes('password was incorrect'), 'Logged output must not contain raw password error');
      assert.ok(fullLog.includes('[REDACTED]'), 'Logged output must have redacted sensitive patterns');
    } finally {
      console.error = originalConsoleError;
    }
  });
});
