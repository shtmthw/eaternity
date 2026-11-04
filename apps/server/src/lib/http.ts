import type { ApiFailure, ApiSuccess } from '@eaternity/shared';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import type { z } from 'zod';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function send<T>(res: Response, data: T, options: { message?: string; status?: number } = {}) {
  const body: ApiSuccess<T> = { success: true, data };
  if (options.message) body.message = options.message;
  res.status(options.status ?? 200).json(body);
}

/** Validates input against a schema and turns the first problem into a 400 response. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? 'Invalid request');
  }
  return result.data;
}

export const apiNotFound: RequestHandler = (req, res) => {
  const body: ApiFailure = { success: false, message: `No route for ${req.method} ${req.originalUrl}` };
  res.status(404).json(body);
};

/** Shape of errors raised by body-parser and serve-static (the http-errors package). */
interface HttpLibraryError {
  type?: string;
  status?: number;
  expose?: boolean;
  message?: string;
}

const isClientError = (error: unknown): error is HttpLibraryError & { status: number } => {
  const status = (error as HttpLibraryError | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  let status = 500;
  let message = 'Something went wrong. Please try again.';

  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
  } else if (error instanceof multer.MulterError) {
    status = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller' : error.message;
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = 'Invalid id';
  } else if ((error as HttpLibraryError | null)?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if ((error as HttpLibraryError | null)?.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  } else if (isClientError(error)) {
    status = error.status;
    message = status === 404 ? 'Not found' : error.expose && error.message ? error.message : 'Bad request';
  } else {
    console.error(error);
  }

  const body: ApiFailure = { success: false, message };
  res.status(status).json(body);
};
