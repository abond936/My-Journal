import type { Session } from 'next-auth';
import { canReadCard, isAdminSession, isAuthenticatedSession } from '@/lib/auth/readerAccess';

function session(role: 'admin' | 'viewer', accessRevoked = false): Session {
  return {
    user: { id: 'user-1', role, accessRevoked },
    expires: 'future',
  };
}

describe('reader access revocation', () => {
  it('retains active reader and administrator access', () => {
    expect(isAuthenticatedSession(session('viewer'))).toBe(true);
    expect(isAdminSession(session('admin'))).toBe(true);
    expect(canReadCard(session('viewer'), { status: 'published' })).toBe(true);
  });

  it('rejects a revoked session regardless of its stale role', () => {
    expect(isAuthenticatedSession(session('viewer', true))).toBe(false);
    expect(isAdminSession(session('admin', true))).toBe(false);
    expect(canReadCard(session('viewer', true), { status: 'published' })).toBe(false);
  });
});
