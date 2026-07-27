const assert = require('node:assert');
const test = require('node:test');

const {
  getAuthenticatedUser,
  triggerRepositoryDispatch,
  triggerWorkflowDispatch,
  sendGitHubRequest,
  getGitHubToken,
} = require('../services/github-service');

test('getAuthenticatedUser calls GET /user with the bearer token and API headers', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({url: String(url), options});
    return {
      ok: true,
      status: 200,
      json: async () => ({login: 'octocat', id: 1}),
      text: async () => JSON.stringify({login: 'octocat', id: 1}),
    };
  };

  const user = await getAuthenticatedUser({token: 'token-1', fetchImpl: fakeFetch});

  assert.deepStrictEqual(user, {login: 'octocat', id: 1});
  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].url, 'https://api.github.com/user');
  assert.strictEqual(requests[0].options.method, 'GET');
  assert.strictEqual(requests[0].options.headers.Authorization, 'Bearer token-1');
  assert.strictEqual(requests[0].options.headers.Accept, 'application/vnd.github+json');
  assert.strictEqual(requests[0].options.headers['X-GitHub-Api-Version'], '2022-11-28');
});

test('sendGitHubRequest throws a clear error when no token is available', async () => {
  const savedToken = process.env.GITHUB_DISPATCH_TOKEN;
  delete process.env.GITHUB_DISPATCH_TOKEN;

  try {
    await assert.rejects(
      () => sendGitHubRequest('/user', {fetchImpl: async () => ({ok: true, status: 200, text: async () => '{}'})}),
      /GitHub token is required/
    );
  } finally {
    if (savedToken === undefined) {
      delete process.env.GITHUB_DISPATCH_TOKEN;
    } else {
      process.env.GITHUB_DISPATCH_TOKEN = savedToken;
    }
  }
});

test('triggerRepositoryDispatch posts event_type and client_payload to the dispatches endpoint', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({url: String(url), options});
    return {ok: true, status: 204, text: async () => ''};
  };

  const result = await triggerRepositoryDispatch('qpc', 'hr-automation', 'new-application', {uid: 5345}, {
    token: 'token-2',
    fetchImpl: fakeFetch,
  });

  assert.strictEqual(result, null); // 204 No Content
  assert.strictEqual(requests[0].url, 'https://api.github.com/repos/qpc/hr-automation/dispatches');
  assert.strictEqual(requests[0].options.method, 'POST');
  assert.deepStrictEqual(JSON.parse(requests[0].options.body), {
    event_type: 'new-application',
    client_payload: {uid: 5345},
  });
});

test('triggerWorkflowDispatch posts ref and inputs to the workflow dispatches endpoint', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({url: String(url), options});
    return {ok: true, status: 204, text: async () => ''};
  };

  await triggerWorkflowDispatch('qpc', 'hr-automation', 'process.yml', 'main', {uid: '5345'}, {
    token: 'token-3',
    fetchImpl: fakeFetch,
  });

  assert.strictEqual(requests[0].url, 'https://api.github.com/repos/qpc/hr-automation/actions/workflows/process.yml/dispatches');
  assert.strictEqual(requests[0].options.method, 'POST');
  assert.deepStrictEqual(JSON.parse(requests[0].options.body), {
    ref: 'main',
    inputs: {uid: '5345'},
  });
});

// DoD security clause: the token must never be hardcoded or logged — verify it does
// not leak into thrown error messages either.
test('a failed request never includes the token in the error message', async () => {
  const secret = 'ghp_supersecrettoken_value';
  const fakeFetch = async () => ({
    ok: false,
    status: 401,
    text: async () => 'Bad credentials',
  });

  await assert.rejects(
    () => sendGitHubRequest('/user', {token: secret, fetchImpl: fakeFetch}),
    (err) => {
      assert.ok(/status 401/.test(err.message), 'error should report the status');
      assert.ok(!err.message.includes(secret), 'error message must not contain the token');
      return true;
    }
  );
});

test('getGitHubToken falls back to the GITHUB_DISPATCH_TOKEN environment variable', () => {
  const savedToken = process.env.GITHUB_DISPATCH_TOKEN;
  process.env.GITHUB_DISPATCH_TOKEN = 'env-token';

  try {
    assert.strictEqual(getGitHubToken(), 'env-token');
    assert.strictEqual(getGitHubToken({token: 'explicit'}), 'explicit');
  } finally {
    if (savedToken === undefined) {
      delete process.env.GITHUB_DISPATCH_TOKEN;
    } else {
      process.env.GITHUB_DISPATCH_TOKEN = savedToken;
    }
  }
});
