import { throwIfJsonApiFailed, type JsonApiError } from '@/lib/utils/httpJsonApiErrors';

function response(ok: boolean, status: number): Response {
  return { ok, status } as Response;
}

describe('throwIfJsonApiFailed', () => {
  it('uses the API message as user-facing copy and preserves technical metadata separately', () => {
    try {
      throwIfJsonApiFailed(
        response(false, 500),
        {
          code: 'CARD_SAVE_FAILED',
          message: 'This card could not be saved. Try again.',
          error: 'FirebaseError: transaction aborted',
        },
        'Card not saved.'
      );
      throw new Error('Expected throwIfJsonApiFailed to throw');
    } catch (error) {
      const apiError = error as JsonApiError;
      expect(apiError.message).toBe('This card could not be saved. Try again.');
      expect(apiError.apiCode).toBe('CARD_SAVE_FAILED');
      expect(apiError.httpStatus).toBe(500);
      expect(apiError.technicalDetail).toBe('FirebaseError: transaction aborted');
    }
  });

  it('uses contextual fallback copy without exposing a technical error or HTTP status', () => {
    expect(() =>
      throwIfJsonApiFailed(
        response(false, 503),
        { error: 'connect ECONNREFUSED 127.0.0.1:8108' },
        'Questions could not be loaded. Try again.'
      )
    ).toThrow('Questions could not be loaded. Try again.');
  });

  it('does nothing for a successful response', () => {
    expect(() => throwIfJsonApiFailed(response(true, 200), {}, 'Not used')).not.toThrow();
  });
});
