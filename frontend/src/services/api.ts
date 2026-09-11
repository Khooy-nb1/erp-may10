export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  message: string | null;
  meta: null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEnvelope<T> {
  success: true;
  data: T[];
  message: string | null;
  meta: PaginationMeta;
}

export interface ErrorDetail {
  field?: string;
  message: string;
}

export interface ErrorEnvelope {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details: ErrorDetail[] | null;
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: ErrorDetail[] | null;

  constructor(code: string, message: string, statusCode: number, details: ErrorDetail[] | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 10000, ...fetchOptions } = options;
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(fetchOptions.headers || {});

  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal || controller.signal,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      if (payload && typeof payload === 'object' && 'error' in payload) {
        const err = (payload as ErrorEnvelope).error;
        throw new ApiError(err.code, err.message, response.status, err.details);
      }
      throw new ApiError(
        'HTTP_ERROR',
        `Request failed with status ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    if (payload && typeof payload === 'object' && 'data' in payload) {
      return (payload as SuccessEnvelope<T>).data;
    }

    return payload as T;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('TIMEOUT_ERROR', `Request timed out after ${timeoutMs}ms`, 408);
    }
    throw new ApiError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Network request failed',
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
