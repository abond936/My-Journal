import {
  canRunMutationE2E,
  isHostedE2ETarget,
} from '../../../../e2e/helpers/mutationTarget';

describe('hosted E2E mutation guard', () => {
  it('treats either configured hosted base URL as hosted', () => {
    expect(isHostedE2ETarget({ E2E_BASE_URL: 'https://production.example' })).toBe(true);
    expect(isHostedE2ETarget({ PLAYWRIGHT_BASE_URL: 'https://preview.example' })).toBe(true);
  });

  it('blocks mutation even when a hosted run claims an isolated target', () => {
    expect(canRunMutationE2E({
      PLAYWRIGHT_BASE_URL: 'https://production.example',
      E2E_MUTATION_TARGET: 'isolated',
    })).toBe(false);
  });

  it('blocks local mutation without an explicit isolated-data declaration', () => {
    expect(canRunMutationE2E({})).toBe(false);
    expect(canRunMutationE2E({ E2E_LOCAL: '1' })).toBe(false);
  });

  it('allows mutation only for an explicitly isolated local run', () => {
    expect(canRunMutationE2E({
      E2E_LOCAL: '1',
      PLAYWRIGHT_BASE_URL: 'https://ignored.example',
      E2E_MUTATION_TARGET: 'isolated',
    })).toBe(true);
  });
});
