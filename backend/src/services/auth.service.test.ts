import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service.js';
import { createAuthMiddleware } from '../middlewares/auth.middleware.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { UserRecord } from '../models/user.model.js';
import { InvalidCredentialsError, AccountInactiveError } from '../utils/errors.js';
import { Request, Response } from 'express';

describe('AuthService Unit Tests', () => {
  let knownHash: string;
  let mockUserRepo: IUserRepository;
  let authService: AuthService;

  const validPassword = 'correct_password_123';
  const wrongPassword = 'wrong_password_999';

  before(async () => {
    knownHash = await AuthService.hashPassword(validPassword);

    const users: UserRecord[] = [
      {
        id: 1,
        ho_ten: 'Nguyễn Văn Bán',
        email: 'sales@example.com',
        mat_khau: knownHash,
        so_dien_thoai: '0912345678',
        vai_tro: 'ban_hang',
        phong_ban: 'Phòng Bán Hàng',
        trang_thai: 'hoat_dong',
      },
      {
        id: 2,
        ho_ten: 'Trần Văn Khóa',
        email: 'locked@example.com',
        mat_khau: knownHash,
        so_dien_thoai: '0987654321',
        vai_tro: 'ban_hang',
        phong_ban: 'Phòng Bán Hàng',
        trang_thai: 'khoa',
      },
    ];

    mockUserRepo = {
      findByEmail: async (email: string) =>
        users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null,
      findById: async (id: number) => users.find((u) => u.id === id) || null,
    };

    authService = new AuthService(mockUserRepo);
  });

  it('login with valid credentials returns token and safe user profile without mat_khau', async () => {
    const result = await authService.login({
      email: 'sales@example.com',
      password: validPassword,
    });

    assert.ok(result.token, 'Token must be returned');
    assert.equal(typeof result.token, 'string');
    assert.equal(result.user.id, 1);
    assert.equal(result.user.email, 'sales@example.com');
    assert.equal(result.user.vai_tro, 'ban_hang');
    assert.equal('mat_khau' in (result.user as Record<string, unknown>), false, 'mat_khau must never be exposed');
  });

  it('login with unknown email throws InvalidCredentialsError (AUTH_INVALID_CREDENTIALS)', async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: 'unknown@example.com',
          password: validPassword,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidCredentialsError);
        assert.equal(err.code, 'AUTH_INVALID_CREDENTIALS');
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });

  it('login with incorrect password throws same InvalidCredentialsError to avoid enumeration', async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: 'sales@example.com',
          password: wrongPassword,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidCredentialsError);
        assert.equal(err.code, 'AUTH_INVALID_CREDENTIALS');
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });

  it('login with inactive account throws AccountInactiveError (AUTH_ACCOUNT_INACTIVE)', async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: 'locked@example.com',
          password: validPassword,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AccountInactiveError);
        assert.equal(err.code, 'AUTH_ACCOUNT_INACTIVE');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  it('login returns a token signed with HS256 and applies expiry (exp > iat)', async () => {
    const result = await authService.login({
      email: 'sales@example.com',
      password: validPassword,
    });

    const decoded = jwt.decode(result.token, { complete: true });
    assert.ok(decoded, 'Issued token must decode to a JOSE header and payload');
    assert.equal(decoded.header.alg, 'HS256', 'Token must be signed with HS256');

    const { exp, iat } = decoded.payload as { exp: number; iat: number };
    assert.equal(typeof exp, 'number', 'exp claim must be present (expiry is applied)');
    assert.equal(typeof iat, 'number', 'iat claim must be present');
    assert.ok(exp > iat, 'exp must be greater than iat');
  });

  it('login-issued token is accepted by createAuthMiddleware (issuer/verifier contract)', async () => {
    const result = await authService.login({
      email: 'sales@example.com',
      password: validPassword,
    });

    const authenticate = createAuthMiddleware(mockUserRepo);
    const req = { headers: { authorization: `Bearer ${result.token}` } } as Request;
    let nextCalls = 0;
    let caughtErr: unknown;

    await authenticate(req, {} as Response, (err) => {
      caughtErr = err;
      nextCalls += 1;
    });

    assert.ifError(caughtErr);
    assert.equal(nextCalls, 1, 'next() must be called exactly once');
    assert.equal(req.userId, 1);
    assert.ok(req.user);
    assert.equal(req.user.vai_tro, 'ban_hang');
  });
});
