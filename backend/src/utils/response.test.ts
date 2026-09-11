import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sendSuccess, sendPaginated, sendError } from './response.js';
import { Response } from 'express';

function createMockResponse(): { res: Response; getStatus: () => number; getBody: () => unknown } {
  let status = 200;
  let body: unknown = null;

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
    res,
    getStatus: () => status,
    getBody: () => body,
  };
}

describe('Response Envelope Helpers', () => {
  it('sendSuccess formats standard success envelope', () => {
    const { res, getStatus, getBody } = createMockResponse();
    const data = { id: 1, name: 'Test Entity' };

    sendSuccess(res, data, 'Operation successful', 201);

    assert.equal(getStatus(), 201);
    assert.deepEqual(getBody(), {
      success: true,
      data,
      message: 'Operation successful',
      meta: null,
    });
  });

  it('sendPaginated formats paginated envelope', () => {
    const { res, getStatus, getBody } = createMockResponse();
    const items = [{ id: 1 }, { id: 2 }];
    const meta = { page: 1, pageSize: 20, total: 2, totalPages: 1 };

    sendPaginated(res, items, meta);

    assert.equal(getStatus(), 200);
    assert.deepEqual(getBody(), {
      success: true,
      data: items,
      message: null,
      meta,
    });
  });

  it('sendError formats standard error envelope without leaking details when null', () => {
    const { res, getStatus, getBody } = createMockResponse();

    sendError(res, 'RESOURCE_NOT_FOUND', 'Entity not found', 404);

    assert.equal(getStatus(), 404);
    assert.deepEqual(getBody(), {
      success: false,
      data: null,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Entity not found',
        details: null,
      },
    });
  });

  it('sendError includes validation details when provided', () => {
    const { res, getStatus, getBody } = createMockResponse();
    const details = [{ field: 'email', message: 'Invalid email address' }];

    sendError(res, 'VALIDATION_ERROR', 'Validation failed', 422, details);

    assert.equal(getStatus(), 422);
    assert.deepEqual(getBody(), {
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
  });
});
