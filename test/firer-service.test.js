const assert = require('node:assert');
const test = require('node:test');

const {
  getDispatchToken,
  createGitHubDispatchClient,
  buildDispatchPayload,
  fireApplicationEvent,
  encodeResumeAttachment,
  DispatchError,
} = require('../services/firer-service');

// KR 3.1 — auth setup
test('getDispatchToken throws when no token is configured', () => {
  const saved = process.env.GITHUB_DISPATCH_TOKEN;
  delete process.env.GITHUB_DISPATCH_TOKEN;
  try {
    assert.throws(() => getDispatchToken(), /GITHUB_DISPATCH_TOKEN/);
  } finally {
    if (saved !== undefined) process.env.GITHUB_DISPATCH_TOKEN = saved;
  }
});

test('createGitHubDispatchClient validates owner/repo', () => {
  assert.throws(() => createGitHubDispatchClient({token: 't'}), /owner/);
  assert.throws(() => createGitHubDispatchClient({token: 't', owner: 'o'}), /repo/);
});

// KR 3.2 — encoding strategy
test('encodeResumeAttachment base64-encodes the resume by default', async () => {
  const buf = Buffer.from('hello world');
  const enc = await encodeResumeAttachment(buf, {filename: 'resume.pdf'});
  assert.strictEqual(enc.encoding, 'base64');
  assert.strictEqual(Buffer.from(enc.content, 'base64').toString(), 'hello world');
  assert.strictEqual(enc.filename, 'resume.pdf');
});

test('encodeResumeAttachment supports a staging strategy', async () => {
  const buf = Buffer.from('hello world');
  const stagingPath = `./.test-staged-${Date.now()}.bin`;
  const enc = await encodeResumeAttachment(buf, {strategy: 'stage', filename: 'r.pdf', stagingPath});
  assert.strictEqual(enc.encoding, 'stage');
  assert.strictEqual(enc.reference, stagingPath);
  require('node:fs').unlinkSync(stagingPath);
});

// KR 3.3 — payload builder
test('buildDispatchPayload includes firstName/lastName/position and encoded attachment', async () => {
  const application = {
    senderEmail: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    position: 'Software Engineer Intern',
    body: 'Hi!',
    attachment: {filename: 'r.pdf', mimeType: 'application/pdf', content: Buffer.from('pdf')},
  };

  const payload = await buildDispatchPayload(application, {eventType: 'intern-application-received'});
  assert.strictEqual(payload.event_type, 'intern-application-received');
  assert.strictEqual(payload.client_payload.firstName, 'Ada');
  assert.strictEqual(payload.client_payload.attachment.encoding, 'base64');
  assert.strictEqual(payload.client_payload.attachment.filename, 'r.pdf');
});

// KR 3.4 — error handling
test('fireApplicationEvent classifies a 401 response as an auth error', async () => {
  const fakeFetch = async () => ({ok: false, status: 401, text: async () => 'bad token'});
  const client = createGitHubDispatchClient({owner: 'o', repo: 'r', token: 't', fetchImpl: fakeFetch});

  await assert.rejects(
    () => fireApplicationEvent(client, {senderEmail: 'a', firstName: 'a', lastName: 'b', position: 'c', body: '', attachment: {filename: 'r', mimeType: 'application/pdf', content: Buffer.from('')}}),
    (err) => err instanceof DispatchError && err.reason === 'auth',
  );
});

// KR 3.5 — mocked integration test
test('fireApplicationEvent sends the correct event_type and client_payload', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({url: String(url), options});
    return {ok: true, status: 204, text: async () => ''};
  };

  const client = createGitHubDispatchClient({owner: 'o', repo: 'r', token: 't', fetchImpl: fakeFetch});
  await fireApplicationEvent(client, {
    senderEmail: 'ada@example.com',
    firstName: 'Ada', lastName: 'Lovelace', position: 'SWE Intern', body: '',
    attachment: {filename: 'r.pdf', mimeType: 'application/pdf', content: Buffer.from('pdf')},
  });

  assert.strictEqual(requests.length, 1);
  assert.ok(requests[0].url.endsWith('/repos/o/r/dispatches'));
  assert.strictEqual(requests[0].options.method, 'POST');
  const body = JSON.parse(requests[0].options.body);
  assert.strictEqual(body.event_type, 'intern-application-received');
  assert.strictEqual(body.client_payload.firstName, 'Ada');
});
