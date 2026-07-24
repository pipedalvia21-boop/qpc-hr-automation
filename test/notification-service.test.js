const assert = require('node:assert');
const test = require('node:test');

const {sendSlackMessage, sendFailureNotification} = require('../services/notification-service');

// KR 8.1 — failure notification
test('sendSlackMessage posts the expected body to the webhook', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({url: String(url), options});
    return {ok: true, status: 200, text: async () => ''};
  };

  await sendSlackMessage(':rotating_light: Workflow failed', {
    webhookUrl: 'https://hooks.slack.test/x',
    fetchImpl: fakeFetch,
  });

  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].url, 'https://hooks.slack.test/x');
  assert.strictEqual(requests[0].options.method, 'POST');
  const body = JSON.parse(requests[0].options.body);
  assert.strictEqual(body.text, ':rotating_light: Workflow failed');
});

test('sendFailureNotification includes stage + runId in the message', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({url: String(url), options});
    return {ok: true, status: 200, text: async () => ''};
  };

  await sendFailureNotification(
    {stage: 'coda-row', message: 'row create failed', runId: 'https://github.com/runs/1'},
    {webhookUrl: 'https://hooks.slack.test/x', fetchImpl: fakeFetch},
  );

  const body = JSON.parse(requests[0].options.body);
  assert.ok(body.text.includes('coda-row'));
  assert.ok(body.text.includes('row create failed'));
  assert.ok(body.text.includes('https://github.com/runs/1'));
});
