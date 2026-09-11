import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from './auth.service.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { UserRecord } from '../models/user.model.js';
import { InvalidCredentialsError, AccountInactiveError } from '../utils/errors.js';

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
});
