import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPackageValidation } from '../src/features/reference-studio/package-validation';
import { PackageView } from '../src/features/reference-studio/package-view';
import {
  createBrowserApplication,
  DxtApplicationProvider,
} from '../src/application/dxt-application-provider';
import { AuthoringRuntimeConfiguration } from '../src/application/configuration-command-facade';
import { definitions } from '../src/mock/reference';
import { LocaleProvider } from '../src/shared/i18n/locale';
import type { ConfigurationPackageVersion } from '../src/domain/reference';

const context = () => {
  const value = createBrowserApplication();
  const id = 'config-package-photo-v2';
  const validate = (exactId: string) =>
    value.configurationCommands.validatePackageVersion(exactId);
  return { value, id, validate };
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

void test('validation stays pending until the authoritative exact result completes; duplicate requests coalesce', async () => {
  const { id, validate } = context();
  const pending = deferred<ConfigurationPackageVersion>();
  let calls = 0;
  const session = createPackageValidation(id, () => {
    calls++;
    return pending.promise;
  });
  const statuses: string[] = [];
  const unsubscribe = session.subscribe(() =>
    statuses.push(session.getSnapshot().status),
  );
  assert.equal(session.getSnapshot().status, 'NOT VALIDATED');
  const running = session.run();
  await session.run();
  assert.equal(calls, 1);
  assert.equal(session.getSnapshot().status, 'VALIDATING');
  pending.resolve(await validate(id));
  await running;
  assert.equal(session.getSnapshot().status, 'PASSED');
  assert.deepEqual(statuses, ['VALIDATING', 'PASSED']);
  unsubscribe();
});

void test('a rejected revalidation immediately withdraws prior PASS and supports retry', async () => {
  const { id, validate } = context();
  const pending = deferred<ConfigurationPackageVersion>();
  let calls = 0;
  const session = createPackageValidation(id, () =>
    ++calls === 2 ? pending.promise : validate(id),
  );
  await session.run();
  assert.equal(session.getSnapshot().status, 'PASSED');
  const retry = session.run();
  assert.equal(session.getSnapshot().status, 'VALIDATING');
  pending.reject(new Error('Validation unavailable'));
  await retry;
  assert.deepEqual(session.getSnapshot(), {
    status: 'FAILED',
    error: 'Validation unavailable',
  });
  await session.run();
  assert.equal(session.getSnapshot().status, 'PASSED');
});

void test('sync validator errors and unauthorized rejections never become PASS', async () => {
  for (const validate of [
    () => {
      throw new Error('Invalid package');
    },
    () => Promise.reject(new Error('Forbidden')),
  ]) {
    const session = createPackageValidation('exact-id', validate);
    await session.run();
    assert.equal(session.getSnapshot().status, 'FAILED');
    assert.ok(session.getSnapshot().error);
  }
});

void test('wrong exact-version results cannot pass', async () => {
  const { id, validate } = context();
  const session = createPackageValidation('another-version', () =>
    validate(id),
  );
  await session.run();
  assert.equal(session.getSnapshot().status, 'FAILED');
  assert.match(session.getSnapshot().error!, /exact package version/);
});

void test('late completion for a previous selection or repository snapshot does not validate the current session', async () => {
  const { id, validate } = context();
  const pending = deferred<ConfigurationPackageVersion>();
  const old = createPackageValidation(id, () => pending.promise);
  const running = old.run();
  const current = createPackageValidation(id, validate);
  pending.resolve(await validate(id));
  await running;
  assert.equal(old.getSnapshot().status, 'PASSED');
  assert.equal(current.getSnapshot().status, 'NOT VALIDATED');
});

void test('PHOTO and CMP exact packages use the existing validator without configuration mutation', async () => {
  const { value, validate } = context();
  const before = JSON.stringify(
    value.application.repositories.configuration.getConfigurationRegistry(),
  );
  for (const id of ['config-package-photo-v2', 'config-package-cmp-v1']) {
    const session = createPackageValidation(id, validate);
    await session.run();
    assert.equal(session.getSnapshot().status, 'PASSED');
  }
  const invalid = createPackageValidation('missing-package', validate);
  await invalid.run();
  assert.equal(invalid.getSnapshot().status, 'FAILED');
  assert.equal(
    JSON.stringify(
      value.application.repositories.configuration.getConfigurationRegistry(),
    ),
    before,
  );
});

void test('deep-link and review initial render never call commands or show PASS, in KO and EN', () => {
  const { value } = context();
  let calls = 0;
  value.configurationCommands.validatePackageVersion = () => {
    calls++;
    throw new Error('Render must be read-only');
  };
  for (const initialReview of [false, true]) {
    for (const locale of ['en', 'ko'] as const) {
      const html = renderToStaticMarkup(
        <LocaleProvider initialLocale={locale} persist={false}>
          <DxtApplicationProvider value={value}>
            <PackageView
              selectedId="config-package-photo-v1"
              onSelect={() => {}}
              refresh={() => {}}
              initialValidation
              initialReview={initialReview}
            />
          </DxtApplicationProvider>
        </LocaleProvider>,
      );
      assert.match(html, locale === 'ko' ? /미검증/ : /NOT VALIDATED/);
      assert.doesNotMatch(html, /class="passed"|>PASSED<|>READY</);
      assert.match(html, /disabled=""/);
    }
  }
  assert.equal(calls, 0);
});

void test('scope permission projection disables validation and activation for a denied viewer', () => {
  const { value } = context();
  const snapshot = {
    registry:
      value.application.repositories.configuration.getConfigurationRegistry(),
    catalog: definitions,
    drafts: [],
    authoredDefinitions: [],
    version: 0,
    permissions: [],
  };
  value.application.repositories.configuration =
    new AuthoringRuntimeConfiguration(snapshot);
  Object.assign(value.application, {
    configurationAuthoringBoundary: {
      load: async () => snapshot,
      execute: async () => {
        throw new Error('No writes allowed');
      },
    },
  });
  let calls = 0;
  value.configurationCommands.validatePackageVersion = () => {
    calls++;
    throw new Error('Denied');
  };
  const html = renderToStaticMarkup(
    <LocaleProvider initialLocale="en" persist={false}>
      <DxtApplicationProvider value={value}>
        <PackageView
          selectedId="config-package-photo-v1"
          onSelect={() => {}}
          refresh={() => {}}
          initialReview
          initialValidation
        />
      </DxtApplicationProvider>
    </LocaleProvider>,
  );
  assert.match(html, /<button disabled="">Validate exact version<\/button>/);
  assert.match(
    html,
    /<button class="rs-primary" disabled="">Activate Package Version<\/button>/,
  );
  assert.match(html, /You do not have permission to validate this package/);
  assert.doesNotMatch(html, /class="passed"/);
  assert.equal(calls, 0);
});
