import type { ApiResponse } from '@eaternity/shared';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  postForm<T>(path: string, form: FormData): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

interface ClientOptions {
  getToken: () => string | null;
  /** Called when the server rejects the stored token. */
  onUnauthorized?: () => void;
}

/** Small typed wrapper around fetch for the { success, data | message } envelope. */
export function createApiClient({ getToken, onUnauthorized }: ClientOptions): ApiClient {
  async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let body: BodyInit | undefined;
    if (options.form) {
      body = options.form;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(path, { method, headers, body, signal: options.signal ?? null });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
    }

    const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
    if (!payload) {
      throw new ApiError(`Unexpected response from the server (${response.status})`, response.status);
    }
    if (!payload.success) {
      if (response.status === 401 && token) onUnauthorized?.();
      throw new ApiError(payload.message, response.status);
    }
    return payload.data;
  }

  return {
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body: body ?? {} }),
    postForm: (path, form) => request('POST', path, { form }),
    delete: (path) => request('DELETE', path),
  };
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export const imageUrl = (fileName: string) => `/images/${encodeURIComponent(fileName)}`;
