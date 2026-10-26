import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initKit, validateKit } from './client-kit.mjs';

function workspace(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'focusbrief-skill-test-'));
  const resolved = fs.realpathSync(base);
  t.after(() => {
    // Restrict recursive cleanup to this exact, newly created test directory.
    if (fs.realpathSync(base) !== resolved || !path.basename(resolved).startsWith('focusbrief-skill-test-') || path.dirname(resolved) !== fs.realpathSync(os.tmpdir())) throw new Error('Unsafe test cleanup path');
    fs.rmSync(resolved, { recursive: true });
  });
  const dir = path.join(base, '客户资料 with spaces'); initKit(dir);
  return dir;
}
const read = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (dir, name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data));
function readyFixture(dir) {
  const p = read(dir, 'client-profile.json');
  // This baseline explicitly exercises a customer who chose manual updates.
  p.automation.requestedMode = 'manual';
  p.objective = '追踪论文方法变化'; p.topics[0].name = '机器学习论文'; p.topics[0].purpose = '安排技术阅读'; p.delivery.os = 'windows';
  p.model = { provider: 'local', baseUrl: 'http://127.0.0.1:11434', modelId: 'fixture-only', apiKeyEnv: null, configurationTest: 'pass', testEvidence: 'evidence/model.txt' };
  fs.mkdirSync(path.join(dir, 'evidence')); fs.writeFileSync(path.join(dir, 'evidence/model.txt'), 'SYNTHETIC TEST EVIDENCE, NOT LIVE'); fs.writeFileSync(path.join(dir, 'evidence/source.txt'), 'SYNTHETIC TEST EVIDENCE, NOT LIVE');
  write(dir, 'evidence/scheduled-run.json', { version: 1, kind: 'scheduled-run', synthetic: true,
    scheduler: { runId: 'synthetic-run', trigger: 'scheduled', scheduledFor: '2026-09-06T00:30:00Z' },
    refreshRun: { id: 'synthetic-run', trigger: 'scheduled', scheduledFor: '2026-09-06T00:30:00Z', startedAt: '2026-09-06T00:30:01Z', completedAt: '2026-09-06T00:31:00Z', status: 'succeeded' },
    publication: { runId: 'synthetic-run', editionId: 'synthetic-edition', publishedAt: '2026-09-06T00:30:59Z' },
    browser: { closedAt: '2026-09-06T00:29:00Z', reopenedAt: '2026-09-06T00:32:00Z', observedEditionId: 'synthetic-edition' } });
  write(dir, 'client-profile.json', p);
  const source = { id: 's1', name: 'Fixture source', kind: 'api', enabled: true, topicIds: ['topic-1'], endpoint: 'https://api.crossref.org/works', docsUrl: 'https://www.crossref.org/documentation/retrieve-metadata/', termsUrl: 'https://www.crossref.org/documentation/retrieve-metadata/', authEnv: null, accessClass: 'free_no_key', commercialUse: 'allowed', contentScope: 'metadata', quota: 'fixture', estimatedMonthlyCost: 0, currency: 'CNY', checkedAt: new Date().toISOString(), probe: { status: 'pass', evidence: 'evidence/source.txt' } };
  write(dir, 'source-manifest.json', { version: 1, sources: [source] });
  const acceptance = read(dir, 'automation-acceptance.json');
  for (const [id, entry] of Object.entries(acceptance.checks)) {
    entry.status = 'pass'; entry.evidence = `evidence/${id}.txt`;
    fs.writeFileSync(path.join(dir, entry.evidence), `SYNTHETIC ${id} EVIDENCE, NOT A LIVE WEBSITE TEST`);
  }
  write(dir, 'automation-acceptance.json', acceptance);
  return { p, source };
}

test('initialization creates a safe draft and refuses existing directory', (t) => {
  const dir = workspace(t);
  assert.equal(validateKit(dir).ok, true);
  assert.equal(read(dir, 'client-profile.json').automation.requestedMode, 'scheduled');
  assert.ok(validateKit(dir).pending.length > 0);
  assert.equal(validateKit(dir, { ready: true }).ok, false);
  assert.throws(() => initKit(dir), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(path.join(dir, '.env.example'), 'utf8').includes('MODEL_API_KEY=\n'), true);
});
test('manual refresh evidence cannot replace background website acceptance', (t) => {
  const dir = workspace(t); const { p } = readyFixture(dir);
  p.automation = { requestedMode: 'scheduled', mode: 'scheduled', tested: 'pass', testEvidence: 'evidence/scheduled-run.json' }; write(dir, 'client-profile.json', p);
  for (const id of ['guidedSetup','sourceMatching','secretStorage','backgroundSchedule','browserClosed','restartCatchup','automaticPublishing','modelSummaries','dedupAndUpdates','freshnessAndHeat','originalLinks']) {
    const checks = read(dir, 'automation-acceptance.json'); const previous = checks.checks[id];
    checks.checks[id] = { status: 'not_run', evidence: null }; write(dir, 'automation-acceptance.json', checks);
    assert.equal(validateKit(dir, { ready: true }).ok, false, id);
    checks.checks[id] = previous; write(dir, 'automation-acceptance.json', checks);
  }
  assert.equal(validateKit(dir, { ready: true }).status, 'document_precheck_ok');
});
test('acceptance JSON damage, missing checks and external evidence are rejected', (t) => {
  const dir = workspace(t); readyFixture(dir); const checks = read(dir, 'automation-acceptance.json');
  delete checks.checks.originalLinks; write(dir, 'automation-acceptance.json', checks); assert.equal(validateKit(dir).ok, false);
  checks.checks.originalLinks = { status: 'pass', evidence: '../outside.txt' }; write(dir, 'automation-acceptance.json', checks); assert.equal(validateKit(dir, { ready: true }).ok, false);
  fs.writeFileSync(path.join(dir, 'automation-acceptance.json'), '{broken'); assert.equal(validateKit(dir).ok, false);
});
test('explicit manual/raw scope skips only inapplicable automation and AI checks', (t) => {
  const dir = workspace(t); const { p } = readyFixture(dir);
  p.intelligence = { mode: 'raw', rawFlowTest: 'pass', testEvidence: 'evidence/source.txt' }; write(dir, 'client-profile.json', p);
  const acceptance = read(dir, 'automation-acceptance.json');
  for (const id of ['backgroundSchedule','browserClosed','restartCatchup','automaticPublishing','modelSummaries']) acceptance.checks[id] = { status: 'not_run', evidence: null };
  write(dir, 'automation-acceptance.json', acceptance); assert.equal(validateKit(dir, { ready: true }).ok, true);
  acceptance.checks.originalLinks = { status: 'not_run', evidence: null }; write(dir, 'automation-acceptance.json', acceptance); assert.equal(validateKit(dir, { ready: true }).ok, false);
});
test('fully recorded synthetic fixture passes document precheck only', (t) => {
  const dir = workspace(t); readyFixture(dir); const result = validateKit(dir, { ready: true }); assert.equal(result.ok, true); assert.equal(result.status, 'document_precheck_ok'); assert.equal(result.deploymentVerified, false);
});
test('corrupt JSON and malformed source objects fail without throwing or echoing contents', (t) => {
  const dir = workspace(t); fs.writeFileSync(path.join(dir, 'source-manifest.json'), '{BROKEN'); assert.equal(validateKit(dir).ok, false);
  write(dir, 'source-manifest.json', { version: 1, sources: [null, []] }); assert.equal(validateKit(dir).ok, false);
});
test('commercial customer cannot use noncommercial or unknown rights sources', (t) => {
  const dir = workspace(t); const { source } = readyFixture(dir);
  for (const policy of ['free_noncommercial', 'unknown']) {
    source.accessClass = policy; write(dir, 'source-manifest.json', { version: 1, sources: [source] }); assert.equal(validateKit(dir, { ready: true }).ok, false);
  }
  source.accessClass = 'free_no_key'; source.commercialUse = 'unknown'; write(dir, 'source-manifest.json', { version: 1, sources: [source] }); assert.equal(validateKit(dir, { ready: true }).ok, false);
});
test('invalid time, timezone and duplicate topic IDs fail', (t) => {
  const dir = workspace(t); const { p } = readyFixture(dir); p.delivery.dailyAt = '25:61'; p.delivery.timeZone = 'Moon/Base'; p.topics.push(p.topics[0]); write(dir, 'client-profile.json', p);
  assert.ok(validateKit(dir).errors.length >= 3);
});
test('source identity, topic references and actual coverage are checked', (t) => {
  const dir = workspace(t); const { source } = readyFixture(dir); source.topicIds = ['missing']; write(dir, 'source-manifest.json', { version: 1, sources: [source, source] });
  assert.equal(validateKit(dir, { ready: true }).ok, false);
});
test('stale or future source checks cannot pass readiness', (t) => {
  const dir = workspace(t); const { source } = readyFixture(dir);
  for (const days of [-31, 2]) { source.checkedAt = new Date(Date.now() + days * 86400000).toISOString(); write(dir, 'source-manifest.json', { version: 1, sources: [source] }); assert.equal(validateKit(dir, { ready: true }).ok, false); }
});
test('nonexistent calendar dates and missing auth references fail readiness', (t) => {
  const dir = workspace(t); const { source } = readyFixture(dir);
  source.checkedAt = '2026-02-30T00:00:00Z'; write(dir, 'source-manifest.json', { version: 1, sources: [source] });
  assert.equal(validateKit(dir, { ready: true, now: Date.parse('2026-03-03T00:00:00Z') }).ok, false);
  source.checkedAt = new Date().toISOString(); source.accessClass = 'free_key'; write(dir, 'source-manifest.json', { version: 1, sources: [source] });
  assert.equal(validateKit(dir, { ready: true }).ok, false);
});
test('evidence must exist inside delivery directory, not traverse out', (t) => {
  const dir = workspace(t); const { source } = readyFixture(dir);
  for (const evidence of ['../outside.txt', '..\\outside.txt', 'C:\\private.txt', 'missing.txt']) { source.probe.evidence = evidence; write(dir, 'source-manifest.json', { version: 1, sources: [source] }); assert.equal(validateKit(dir, { ready: true }).ok, false); }
});
test('scheduled mode requires distinct scheduler evidence', (t) => {
  const dir = workspace(t); const { p } = readyFixture(dir); p.automation.requestedMode = 'scheduled'; p.automation.mode = 'scheduled'; write(dir, 'client-profile.json', p); assert.equal(validateKit(dir, { ready: true }).ok, false);
  p.automation.tested = 'pass'; p.automation.testEvidence = 'evidence/scheduled-run.json'; write(dir, 'client-profile.json', p); assert.equal(validateKit(dir, { ready: true }).ok, true);
});
test('scheduled proof rejects manual trigger, wrong edition, invalid timeline and plain text', (t) => {
  const dir = workspace(t); const { p } = readyFixture(dir); p.automation = { requestedMode: 'scheduled', mode: 'scheduled', tested: 'pass', testEvidence: 'evidence/scheduled-run.json' }; write(dir, 'client-profile.json', p);
  const valid = read(dir, 'evidence/scheduled-run.json');
  for (const mutate of [
    (trace) => { trace.refreshRun.trigger = 'manual'; },
    (trace) => { trace.publication.runId = 'different-run'; },
    (trace) => { trace.browser.observedEditionId = 'old-edition'; },
    (trace) => { trace.browser.closedAt = '2026-09-06T00:33:00Z'; }
  ]) { const trace = structuredClone(valid); mutate(trace); write(dir, 'evidence/scheduled-run.json', trace); assert.equal(validateKit(dir, { ready: true }).ok, false); }
  fs.writeFileSync(path.join(dir, 'evidence/scheduled-run.json'), 'SYNTHETIC PLAIN TEXT'); assert.equal(validateKit(dir, { ready: true }).ok, false);
});
test('manual current mode cannot bypass a customer request for scheduling', (t) => {
  const dir = workspace(t); const { p } = readyFixture(dir); p.automation.requestedMode = 'scheduled'; write(dir, 'client-profile.json', p);
  assert.equal(validateKit(dir, { ready: true }).ok, false);
  assert.ok(validateKit(dir).pending.some((message) => message.includes('客户要求')));
});
test('explicit raw mode needs its own flow evidence, not an API key', (t) => {
  const dir = workspace(t); const { p } = readyFixture(dir);
  p.model = { provider: 'unconfigured', baseUrl: null, modelId: null, apiKeyEnv: null, configurationTest: 'not_run', testEvidence: null }; p.intelligence.mode = 'raw'; write(dir, 'client-profile.json', p);
  assert.equal(validateKit(dir, { ready: true }).ok, false);
  p.intelligence.rawFlowTest = 'pass'; p.intelligence.testEvidence = 'evidence/raw.txt'; fs.writeFileSync(path.join(dir, 'evidence/raw.txt'), 'SYNTHETIC RAW FLOW EVIDENCE'); write(dir, 'client-profile.json', p);
  assert.equal(validateKit(dir, { ready: true }).ok, true);
});
test('estimated source costs cannot exceed zero budget', (t) => {
  const dir = workspace(t); const { source } = readyFixture(dir); source.estimatedMonthlyCost = 1; write(dir, 'source-manifest.json', { version: 1, sources: [source] }); assert.equal(validateKit(dir, { ready: true }).ok, false);
});
test('inline secrets and URL credentials fail with no secret in diagnostics', (t) => {
  const dir = workspace(t); const { p, source } = readyFixture(dir); p.model.apiKey = 'FAKE_SECRET_FOR_TEST_ONLY'; write(dir, 'client-profile.json', p);
  let result = validateKit(dir); assert.equal(result.ok, false); assert.equal(JSON.stringify(result).includes(p.model.apiKey), false);
  delete p.model.apiKey; write(dir, 'client-profile.json', p); source.endpoint = 'https://api.crossref.org/works?api_key=FAKE_SECRET_FOR_TEST_ONLY'; write(dir, 'source-manifest.json', { version: 1, sources: [source] }); result = validateKit(dir); assert.equal(result.ok, false); assert.equal(JSON.stringify(result).includes('FAKE_SECRET_FOR_TEST_ONLY'), false);
});
test('model failure and source failure do not pass readiness', (t) => {
  const dir = workspace(t); const { p, source } = readyFixture(dir); p.model.configurationTest = 'fail'; source.probe.status = 'fail'; write(dir, 'client-profile.json', p); write(dir, 'source-manifest.json', { version: 1, sources: [source] }); assert.equal(validateKit(dir, { ready: true }).ok, false);
});
