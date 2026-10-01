import type { ConfigurationCommandFacade } from '@/src/application/configuration-command-facade';

export type PackageValidationState =
  | { status: 'NOT VALIDATED' | 'VALIDATING' | 'PASSED'; error?: never }
  | { status: 'FAILED'; error: string };

/** View-local evidence for one exact package and repository snapshot, never a release status. */
export function createPackageValidation(
  packageVersionId: string,
  validate: ConfigurationCommandFacade['validatePackageVersion'],
) {
  let state: PackageValidationState = { status: 'NOT VALIDATED' };
  const listeners = new Set<() => void>();
  const publish = (next: PackageValidationState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async run() {
      if (state.status === 'VALIDATING') return;
      publish({ status: 'VALIDATING' });
      try {
        const result = await validate(packageVersionId);
        if (result?.id !== packageVersionId)
          throw new Error(
            'Validation did not return the selected exact package version.',
          );
        publish({ status: 'PASSED' });
      } catch (error) {
        publish({
          status: 'FAILED',
          error:
            error instanceof Error
              ? error.message
              : 'Package validation failed.',
        });
      }
    },
  };
}
