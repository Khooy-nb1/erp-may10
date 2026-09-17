import api from '../../services/api';

/**
 * Sales module API client.
 *
 * All module traffic goes through Core's axios instance (\`src/services/api.js\`),
 * so the bearer token, base URL (\`/api/v1\`) and authentication failures stay
 * centralized (PLAN Step 6E). Nothing in the module reads token storage.
 *
 * Core renders failures as the flat contract §9.3 envelope
 * \`{ success: false, message, errorCode, details }\`; \`ApiError\` carries that shape
 * unchanged so screens can render field-level \`details\`.
 */
export class ApiError extends Error {
  constructor(code, message, statusCode, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.errorCode = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** Normalizes an axios failure into the module's error contract. */
export function toApiError(error) {
  const response = error && error.response;
  const payload = response && response.data;

  if (payload && typeof payload === 'object' && payload.success === false) {
    return new ApiError(
      payload.errorCode || 'HTTP_ERROR',
      payload.message || 'Đã có lỗi xảy ra.',
      response.status,
      Array.isArray(payload.details) ? payload.details : null
    );
  }

  if (response) {
    return new ApiError('HTTP_ERROR', 'Yêu cầu thất bại với mã ' + response.status + '.', response.status);
  }

  return new ApiError('NETWORK_ERROR', (error && error.message) || 'Không thể kết nối tới máy chủ.', 0);
}

/** Runs a request through Core's axios instance and unwraps the success envelope. */
export async function request(config) {
  try {
    const response = await api.request(config);
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload;
    }
    return { success: true, data: payload, message: null, meta: null };
  } catch (error) {
    throw toApiError(error);
  }
}

/** Convenience for detail endpoints: returns \`data\` directly. */
export async function requestData(config) {
  const payload = await request(config);
  return payload.data;
}

/** Drops \`undefined\`/\`null\`/empty-string filters so axios does not send blank params. */
export function cleanParams(params = {}) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out;
}
