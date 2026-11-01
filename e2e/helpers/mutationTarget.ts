export type MutationE2EEnvironment = {
  [key: string]: string | undefined;
  E2E_BASE_URL?: string;
  PLAYWRIGHT_BASE_URL?: string;
  E2E_LOCAL?: string;
  E2E_MUTATION_TARGET?: string;
};

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function isHostedE2ETarget(environment: MutationE2EEnvironment = process.env): boolean {
  if (environment.E2E_LOCAL === '1') return false;
  return hasValue(environment.E2E_BASE_URL) || hasValue(environment.PLAYWRIGHT_BASE_URL);
}

export function canRunMutationE2E(environment: MutationE2EEnvironment = process.env): boolean {
  return (
    environment.E2E_MUTATION_TARGET?.trim().toLowerCase() === 'isolated' &&
    !isHostedE2ETarget(environment)
  );
}
