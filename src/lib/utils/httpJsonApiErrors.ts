type JsonApiErrorBody = {
  code?: string;
  message?: string;
  error?: string;
};

function messageFromJsonBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const data = body as JsonApiErrorBody;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  return fallback;
}

/**
 * Throws a descriptive `Error` when a JSON API response is not OK.
 * Preserves optional `code` from the body on `error.apiCode` for callers that branch on domain codes.
 */
export function throwIfJsonApiFailed(res: Response, body: unknown, fallbackMessage: string): void {
  if (res.ok) return;
  const msg = messageFromJsonBody(body, fallbackMessage);
  const err = new Error(msg) as Error & { apiCode?: string };
  if (body && typeof body === 'object') {
    const code = (body as JsonApiErrorBody).code;
    if (typeof code === 'string' && code) err.apiCode = code;
  }
  throw err;
}
