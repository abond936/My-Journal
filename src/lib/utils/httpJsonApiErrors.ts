type JsonApiErrorBody = {
  code?: string;
  message?: string;
  error?: string;
};

function messageFromJsonBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const data = body as JsonApiErrorBody;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  return fallback;
}

export type JsonApiError = Error & {
  apiCode?: string;
  httpStatus: number;
  technicalDetail?: string;
};

/**
 * Throws a descriptive `Error` when a JSON API response is not OK.
 * Preserves optional `code` from the body on `error.apiCode` for callers that branch on domain codes.
 */
export function throwIfJsonApiFailed(res: Response, body: unknown, fallbackMessage: string): void {
  if (res.ok) return;
  const err = new Error(messageFromJsonBody(body, fallbackMessage)) as JsonApiError;
  err.httpStatus = res.status;
  if (body && typeof body === 'object') {
    const { code, error } = body as JsonApiErrorBody;
    if (typeof code === 'string' && code) err.apiCode = code;
    if (typeof error === 'string' && error.trim()) err.technicalDetail = error;
  }
  throw err;
}
