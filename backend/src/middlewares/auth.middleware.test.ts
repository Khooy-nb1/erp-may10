import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createAuthMiddleware, requireRole, AuthMiddleware } from './auth.middleware.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { UserRecord } from '../models/user.model.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { Request, Response } from 'express';

describe('Auth Middleware & RBAC Tests', () => {
  let mockUserRepo: IUserRepository;
  let authenticate: AuthMiddleware;
  let validTokenSales: string;
  let validTokenAdmin: string;
  let validTokenLocked: string;

  before(async () => {
    const users: UserRecord[] = [
      {
        id: 1,
        ho_ten: 'Nguyễn Văn Bán',
        email: 'sales@example.com',
        mat_khau: 'hash',
        so_dien_thoai: null,
        vai_tro: 'ban_hang',
        phong_ban: null,
        trang_thai: 'hoat_dong',
      },
      {
        id: 2,
        ho_ten: 'Quản Trị Viên',
        email: 'admin@example.com',
        mat_khau: 'hash',
        so_dien_thoai: null,
        vai_tro: 'admin',
        phong_ban: null,
        trang_thai: 'hoat_dong',
      },
      {
        id: 3,
        ho_ten: 'Đã Bị Khóa',
        email: 'locked@example.com',
        mat_khau: 'hash',
        so_dien_thoai: null,
        vai_tro: 'ban_hang',
        phong_ban: null,
        trang_thai: 'khoa',
      },
    ];

    mockUserRepo = {
      findByEmail: async (email: string) => users.find((u) => u.email === email) || null,
      findById: async (id: number) => users.find((u) => u.id === id) || null,
    };

    authenticate = createAuthMiddleware(mockUserRepo);

    validTokenSales = jwt.sign({ id: 1, email: 'sales@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);
    validTokenAdmin = jwt.sign({ id: 2, email: 'admin@example.com', vai_tro: 'admin' }, env.JWT_SECRET);
    validTokenLocked = jwt.sign({ id: 3, email: 'locked@example.com', vai_tro: 'ban_hang' }, env.JWT_SECRET);
  });

  it('rejects request without Authorization header with UnauthorizedError (401)', async () => {
    const req = { headers: {} } as Request;
    let caughtErr: unknown;

    await authenticate(req, {} as Response, (err) => {
      caughtErr = err;
    });

    assert.ok(caughtErr instanceof UnauthorizedError);
    assert.equal(caughtErr.statusCode, 401);
  });

  it('rejects malformed or non-Bearer authorization header with 401', async () => {
    const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } } as Request;
    let caughtErr: unknown;

    await authenticate(req, {} as Response, (err) => {
      caughtErr = err;
    });

    assert.ok(caughtErr instanceof UnauthorizedError);
    assert.equal(caughtErr.statusCode, 401);
  });

  it('rejects token with invalid signature with 401', async () => {
    const forgedToken = jwt.sign({ id: 1 }, 'wrong_secret');
    const req = { headers: { authorization: `Bearer ${forgedToken}` } } as Request;
    let caughtErr: unknown;

    await authenticate(req, {} as Response, (err) => {
      caughtErr = err;
    });

    assert.ok(caughtErr instanceof UnauthorizedError);
    assert.equal(caughtErr.statusCode, 401);
  });

  it('rejects valid token if user account was subsequently locked or deactivated', async () => {
    const req = { headers: { authorization: `Bearer ${validTokenLocked}` } } as Request;
    let caughtErr: unknown;

    await authenticate(req, {} as Response, (err) => {
      caughtErr = err;
    });

    assert.ok(caughtErr instanceof UnauthorizedError);
    assert.equal(caughtErr.statusCode, 401);
  });

  it('accepts valid token, populating req.user and req.userId', async () => {
    const req = { headers: { authorization: `Bearer ${validTokenSales}` } } as Request;
    let nextCalled = false;

    await authenticate(req, {} as Response, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(req.user);
    assert.equal(req.user.id, 1);
    assert.equal(req.user.vai_tro, 'ban_hang');
    assert.equal(req.userId, 1);
  });

  it('requireRole allows request when user has permitted role', () => {
    const req = { user: { vai_tro: 'ban_hang' } } as Request;
    const guard = requireRole('ban_hang', 'admin');
    let nextCalled = false;

    guard(req, {} as Response, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it('requireRole allows admin access by default across capabilities', () => {
    const req = { user: { vai_tro: 'admin' } } as Request;
    const guard = requireRole('ke_toan');
    let nextCalled = false;

    guard(req, {} as Response, (err) => {
      assert.ifError(err);
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  it('requireRole rejects under-permissioned role with ForbiddenError (403)', () => {
    const req = { user: { vai_tro: 'ban_hang' } } as Request;
    const guard = requireRole('ke_toan');
    let caughtErr: unknown;

    guard(req, {} as Response, (err) => {
      caughtErr = err;
    });

    assert.ok(caughtErr instanceof ForbiddenError);
    assert.equal(caughtErr.statusCode, 403);
    assert.equal(caughtErr.code, 'AUTH_FORBIDDEN');
  });
});
