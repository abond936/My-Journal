import nextConfig from '../../../next.config';

describe('hosted security configuration', () => {
  it('applies baseline response protections without granting global cross-origin API access', async () => {
    const rules = await nextConfig.headers?.();
    const serialized = JSON.stringify(rules);

    expect(serialized).toContain('X-Content-Type-Options');
    expect(serialized).toContain('Referrer-Policy');
    expect(serialized).toContain('X-Frame-Options');
    expect(serialized).toContain('Permissions-Policy');
    expect(serialized).not.toContain('Access-Control-Allow-Origin');
    expect(serialized).not.toContain('Access-Control-Allow-Credentials');
  });
});
