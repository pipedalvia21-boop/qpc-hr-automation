const DEFAULT_API_BASE_URL = 'https://api.github.com/';
const DEFAULT_API_VERSION = '2022-11-28';
const DEFAULT_USER_AGENT = 'hr-automation-github-service';

/**
 * Brief Summary: Return the GitHub token from options or the environment.
 *
 * The token is treated as a secret: it is read here and passed only into the
 * Authorization header. It is never logged or included in thrown errors.
 *
 * Parameters (Arguments):
 * - options (Object, optional):
 *   - token (string, optional): Explicit token. Falls back to env `GITHUB_DISPATCH_TOKEN`.
 *
 * Returns: string - The token to use, or an empty string if none found.
 *
 * Raises / Errors: None.
 *
 * Examples:
 * const token = getGitHubToken({ token: 'ghp_xxx' });
 */
function getGitHubToken(options = {}) {
  return options.token || process.env.GITHUB_DISPATCH_TOKEN || '';
}

/**
 * Brief Summary: Build a full URL for a GitHub API request.
 *
 * Parameters (Arguments):
 * - pathname (string, required): Path relative to the API base (e.g. '/user').
 * - queryParams (Object, optional): Map of query params; undefined/null/'' are omitted.
 *
 * Returns: URL - The full request URL.
 *
 * Raises / Errors: May throw if `new URL()` receives invalid input.
 *
 * Examples:
 * createGitHubRequestUrl('/repos/octo/hello/dispatches');
 */
function createGitHubRequestUrl(pathname, queryParams = {}) {
  const normalizedPathname = String(pathname).replace(/^\//, '');
  const url = new URL(normalizedPathname, DEFAULT_API_BASE_URL);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url;
}

/**
 * Brief Summary: Send an authenticated request to the GitHub API and return parsed JSON.
 *
 * Parameters (Arguments):
 * - pathname (string, required): API path relative to the base (e.g. '/user').
 * - options (Object, optional):
 *   - method (string, optional): HTTP method (default: 'GET').
 *   - token (string, optional): Token to use; falls back to GITHUB_DISPATCH_TOKEN.
 *   - fetchImpl (function, optional): Fetch-compatible implementation. Defaults to
 *     `globalThis.fetch`. Injected in tests so no real network is needed.
 *   - body (any, optional): Request body (JSON-stringified when present).
 *   - queryParams (Object, optional): Query parameters to include in the URL.
 *
 * Returns: Promise<any> - Parsed JSON body, or null for empty/204 responses.
 *
 * Raises / Errors: Throws when fetchImpl is not a function, when no token is available,
 * or when the response status is non-OK. Thrown errors include the path, status, and
 * response body, but NEVER the token.
 *
 * Examples:
 * await sendGitHubRequest('/user', { token: 'ghp_xxx' });
 */
async function sendGitHubRequest(pathname, {method = 'GET', token, fetchImpl = globalThis.fetch, body, queryParams = {}} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to call the GitHub API.');
  }

  const authToken = getGitHubToken({token});

  if (!authToken) {
    throw new Error('A GitHub token is required. Set GITHUB_DISPATCH_TOKEN or pass token explicitly.');
  }

  const url = createGitHubRequestUrl(pathname, queryParams);
  const response = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': DEFAULT_API_VERSION,
      'User-Agent': DEFAULT_USER_AGENT,
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // Deliberately excludes the token so it can never leak into logs.
    throw new Error(`GitHub API request to ${pathname} failed with status ${response.status}${errorBody ? `: ${errorBody}` : ''}`);
  }

  // Dispatch endpoints reply 204 No Content; guard against parsing an empty body.
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Brief Summary: Fetch the authenticated user — the DoD "test call" that proves auth.
 *
 * Parameters (Arguments):
 * - options (Object, optional): { token, fetchImpl } forwarded to sendGitHubRequest.
 *
 * Returns: Promise<Object> - The GitHub user object (includes `login`, `id`).
 *
 * Raises / Errors: See sendGitHubRequest (e.g. 401 on a bad/expired token).
 *
 * Examples:
 * const me = await getAuthenticatedUser();
 */
async function getAuthenticatedUser(options = {}) {
  return sendGitHubRequest('/user', {
    method: 'GET',
    token: options.token,
    fetchImpl: options.fetchImpl,
  });
}

/**
 * Brief Summary: Fire a repository_dispatch event (trigger a workflow by custom event type).
 *
 * Parameters (Arguments):
 * - owner (string, required): Repository owner (org or user).
 * - repo (string, required): Repository name.
 * - eventType (string, required): The custom `event_type` a workflow listens for.
 * - clientPayload (Object, optional): Arbitrary JSON passed to the workflow.
 * - options (Object, optional): { token, fetchImpl }.
 *
 * Returns: Promise<null> - Resolves to null on success (GitHub replies 204).
 *
 * Raises / Errors: Throws when owner/repo/eventType are missing, or on a non-OK response.
 *
 * Examples:
 * await triggerRepositoryDispatch('qpc', 'hr-automation', 'new-application', { uid: 5345 });
 */
async function triggerRepositoryDispatch(owner, repo, eventType, clientPayload, options = {}) {
  if (!owner || !repo) {
    throw new Error('owner and repo are required for a repository dispatch.');
  }

  if (!eventType) {
    throw new Error('An event_type is required for a repository dispatch.');
  }

  return sendGitHubRequest(`/repos/${owner}/${repo}/dispatches`, {
    method: 'POST',
    token: options.token,
    fetchImpl: options.fetchImpl,
    body: {
      event_type: eventType,
      ...(clientPayload !== undefined && clientPayload !== null ? {client_payload: clientPayload} : {}),
    },
  });
}

/**
 * Brief Summary: Fire a workflow_dispatch event (trigger a specific workflow on a ref).
 *
 * Parameters (Arguments):
 * - owner (string, required): Repository owner (org or user).
 * - repo (string, required): Repository name.
 * - workflowId (string|number, required): Workflow file name (e.g. 'ci.yml') or numeric id.
 * - ref (string, required): Branch or tag to run the workflow on.
 * - inputs (Object, optional): Inputs defined by the workflow's `workflow_dispatch`.
 * - options (Object, optional): { token, fetchImpl }.
 *
 * Returns: Promise<null> - Resolves to null on success (GitHub replies 204).
 *
 * Raises / Errors: Throws when owner/repo/workflowId/ref are missing, or on a non-OK response.
 *
 * Examples:
 * await triggerWorkflowDispatch('qpc', 'hr-automation', 'process.yml', 'main', { uid: '5345' });
 */
async function triggerWorkflowDispatch(owner, repo, workflowId, ref, inputs, options = {}) {
  if (!owner || !repo) {
    throw new Error('owner and repo are required for a workflow dispatch.');
  }

  if (!workflowId) {
    throw new Error('A workflowId (file name or numeric id) is required for a workflow dispatch.');
  }

  if (!ref) {
    throw new Error('A ref (branch or tag) is required for a workflow dispatch.');
  }

  return sendGitHubRequest(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    token: options.token,
    fetchImpl: options.fetchImpl,
    body: {
      ref,
      ...(inputs && Object.keys(inputs).length ? {inputs} : {}),
    },
  });
}

module.exports = {
  // public API
  getAuthenticatedUser,
  triggerRepositoryDispatch,
  triggerWorkflowDispatch,
  sendGitHubRequest,
  // helpers (exported for testing)
  getGitHubToken,
  createGitHubRequestUrl,
};

if (require.main === module) {
  console.log('GitHub service loaded. Import getAuthenticatedUser or triggerRepositoryDispatch from this module.');
}
