import { Response } from 'express';

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

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string | null = null,
  statusCode = 200
): Response {
  const payload: SuccessEnvelope<T> = {
    success: true,
    data,
    message,
    meta: null,
  };
  return res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message: string | null = null,
  statusCode = 200
): Response {
  const payload: PaginatedEnvelope<T> = {
    success: true,
    data,
    message,
    meta,
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 500,
  details: ErrorDetail[] | null = null
): Response {
  const payload: ErrorEnvelope = {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
  };
  return res.status(statusCode).json(payload);
}
