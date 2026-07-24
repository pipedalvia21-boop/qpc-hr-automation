const assert = require('node:assert');
const test = require('node:test');

const {retry, computeRetryDelay, shouldRetryDefault} = require('../services/retry-service');

// KR 7.4 — retry logic for transient failures
test('shouldRetryDefault retries on 429 and 5xx', () => {
  assert.strictEqual(shouldRetryDefault(Object.assign(new Error('429'), {status: 429})), true);
  assert.strictEqual(shouldRetryDefault(Object.assign(new Error('500'), {status: 500})), true);
  assert.strictEqual(shouldRetryDefault(Object.assign(new Error('502'), {status: 502})), true);
});

test('shouldRetryDefault does not retry on 400', () => {
  assert.strictEqual(shouldRetryDefault(Object.assign(new Error('400'), {status: 400})), false);
});

test('computeRetryDelay is bounded by maxMs', () => {
  const d = computeRetryDelay(20, {baseMs: 100, maxMs: 1000});
  assert.ok(d >= 0 && d <= 1000);
});

test('retry succeeds on the second attempt after a transient failure', async () => {
  let calls = 0;
  const result = await retry(async () => {
    calls += 1;
    if (calls === 1) {
      throw Object.assign(new Error('503'), {status: 503});
    }
    return 'ok';
  }, {baseMs: 1, maxMs: 1, maxAttempts: 3});

  assert.strictEqual(result, 'ok');
  assert.strictEqual(calls, 2);
});

test('retry gives up and throws after maxAttempts', async () => {
  let calls = 0;
  await assert.rejects(
    () => retry(async () => {
      calls += 1;
      throw Object.assign(new Error('500'), {status: 500});
    }, {baseMs: 1, maxMs: 1, maxAttempts: 3}),
    /500/,
  );
  assert.strictEqual(calls, 3);
});
