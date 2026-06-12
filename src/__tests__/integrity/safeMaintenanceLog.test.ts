import {
  formatEnvPresence,
  redactSecretsInText,
  safeMaintenanceErrorMessage,
} from '@/lib/scripts/utils/safeMaintenanceLog';

describe('safe maintenance logging (8b)', () => {
  it('formatEnvPresence reports Set/Not set without values', () => {
    expect(formatEnvPresence('secret-value')).toBe('Set');
    expect(formatEnvPresence('')).toBe('Not set');
    expect(formatEnvPresence(undefined)).toBe('Not set');
  });

  it('redactSecretsInText removes PEM blocks and common key patterns', () => {
    const pem = 'failed: -----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
    expect(redactSecretsInText(pem)).not.toContain('abc');
    expect(redactSecretsInText(pem)).toContain('[REDACTED]');
    expect(redactSecretsInText('api_key=super-secret-token')).toBe('[REDACTED]');
    expect(redactSecretsInText('AIzaSyD1234567890abcdefghijklmnop')).toBe('[REDACTED]');
  });

  it('safeMaintenanceErrorMessage redacts Error messages', () => {
    const err = new Error('Auth failed private_key=shhh');
    expect(safeMaintenanceErrorMessage(err)).toBe('Auth failed [REDACTED]');
  });
});
