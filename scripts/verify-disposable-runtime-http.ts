/** Network-level AGENT checks. Never Human acceptance or an existing UAT seed. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { SampleAggregate, SampleDetail } from '../src/application/sample-lifecycle';

const directory = resolve(process.argv[2] ?? '');
assert.ok(directory.startsWith(join(process.cwd(), 'tmp/agent-integration-')));
const environment = JSON.parse(await readFile(join(directory, 'environment.json'), 'utf8'));
assert.equal(environment.label, 'AGENT TEST ONLY');
const servers: { principal: string; baseUrl: string }[] = JSON.parse(await readFile(join(directory, 'servers.json'), 'utf8'));
const evidence: { operation: string; principal: string; status: number }[] = [];
async function request(principal: string, endpoint: string, body: object, expected = 200) {
  const server = servers.find(s => s.principal === `agent-integration-${principal}`)!;
  assert.ok(server && new URL(server.baseUrl).hostname === '127.0.0.1');
  const response = await fetch(server.baseUrl + endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const value = await response.json();
  evidence.push({ operation: String((body as { operation: string }).operation), principal, status: response.status });
  assert.equal(response.status, expected, JSON.stringify(value));
  return value;
}
const sample = (principal: string, body: object, expected = 200) => request(principal, '/api/samples', body, expected);
const repository = (principal: string, body: object, expected = 200) => request(principal, '/api/repository', body, expected);
const options = await sample('writer', { operation: 'options' });
assert.ok(options.length > 0);
const id = randomUUID(), revisionId = randomUUID(), rootId = randomUUID(), now = new Date().toISOString();
const aggregate: SampleAggregate = {
  owningOrgId: options[0].id,
  sample: { id, sampleCode: `AGENT-HTTP-${id.slice(0, 8)}`, name: 'AGENT HTTP test — not scientific evidence',
    materialId: null, supplierId: null, description: 'Disposable network contract', status: 'Draft', createdAt: now },
  revision: { id: revisionId, sampleId: id, revision: 1, requestNumber: null, developmentItemNumber: null,
    registrationSource: 'DIRECT_REGISTRATION', effectiveAt: now, status: 'Draft', createdAt: now },
  composition: { nodes: [{ id: rootId, nodeType: 'SAMPLE_REVISION', referenceId: revisionId, label: 'Agent root' }], edges: [] },
  properties: [{ id: randomUUID(), materialNodeId: rootId, propertyDefinitionId: 'property-viscosity-v1',
    valueType: 'NUMBER', value: 0, unit: 'cP', source: 'DIRECT_ENTRY', effectiveAt: now, evidenceId: null }],
};
const command = { operation: 'write', commandId: randomUUID(), expectedLatest: 0, aggregate };
const first = await sample('writer', command) as SampleDetail;
assert.equal(first.revision.id, revisionId);
assert.equal(first.properties[0].value, 0);
assert.equal((await sample('writer', command)).revision.id, revisionId, 'exact HTTP retry is idempotent');
const revised = structuredClone(aggregate);
revised.revision = { ...revised.revision, id: randomUUID(), revision: 2 };
revised.composition.nodes[0].referenceId = revised.revision.id;
revised.properties[0].value = 1;
const second = await sample('writer', { operation: 'write', commandId: randomUUID(), expectedLatest: 1, aggregate: revised });
assert.equal(second.latestRevision, 2);
assert.equal((await sample('writer', { operation: 'detail', id, revision: 1 })).properties[0].value, 0, 'old revision remains exact');
assert.equal((await sample('viewer', { operation: 'detail', id })).properties[0].value, 1);
assert.deepEqual(await sample('viewer', { operation: 'options' }), []);
await sample('viewer', { ...command, commandId: randomUUID() }, 403);
assert.equal((await sample('denied', { operation: 'list' })).rows.length, 0);
await sample('denied', { operation: 'detail', id }, 404);
const manifest = JSON.parse(await readFile(join(directory, 'routes.json'), 'utf8'));
for (const route of manifest.routes) {
  const run = await repository('writer', { operation: 'run.created', slug: route.study, runNumber: route.run });
  assert.ok(run.id);
  const criteria = await repository('writer', { operation: 'run.criteria.load', runId: run.id });
  assert.equal(criteria.activeContextId, null, 'no automatic criteria');
  assert.equal(criteria.origin, 'ABSENT');
  const read = await repository('viewer', { operation: 'run.planning', runId: run.id });
  assert.equal(read.canEditPlan, false);
  await repository('denied', { operation: 'run.get', runId: run.id }, 403);
}
const result = { label: 'AGENT HTTP CHECKS — HUMAN ACCEPTANCE NOT RUN', sampleId: id, revisionIds: [revisionId, revised.revision.id], evidence };
await writeFile(join(directory, 'http-evidence.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
