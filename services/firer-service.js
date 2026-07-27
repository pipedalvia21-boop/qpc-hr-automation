/**
 * firer-service.js
 *
 * Triggers a `repository_dispatch` event on GitHub so a downstream
 * workflow can pick the application up and process it (Drive upload,
 * Coda row). Implements KR 3.1 (auth + client), KR 3.2 (attachment
 * encoding/staging), KR 3.3 (payload builder + dispatch), and KR 3.4
 * (error handling for dispatch failures).
 */

require('dotenv').config();

const path = require('node:path');
const fsp = require('node:fs/promises');

const {sendGitHubRequest} = require('./github-service');

const DEFAULT_EVENT_TYPE = 'intern-application-received';

/**
 * Brief Summary: Resolve the GitHub token used to call the dispatch API.
 * Token is read from options or the GITHUB_DISPATCH_TOKEN env var, and
 * is never logged or echoed back.
 *
 * Parameters (Arguments):
 * - options (Object, optional):
 *   - token (string, optional): Explicit token. Falls back to
 *     GITHUB_DISPATCH_TOKEN.
 *
 * Returns: string - The resolved token.
 *
 * Raises / Errors: Throws Error when no token is found.
 *
 * Examples:
 * const token = getDispatchToken();
 */
function getDispatchToken(options = {}) {
  const token = options.token || process.env.GITHUB_DISPATCH_TOKEN;

  if (!token) {
    throw new Error('A GitHub token is required. Set GITHUB_DISPATCH_TOKEN or pass token explicitly.');
  }

  return token;
}

/**
 * Brief Summary: Create a small wrapper around the GitHub REST client
 * used to fire `repository_dispatch` events. The wrapper accepts a
 * fetch implementation so tests can mock the network call (KR 3.5).
 *
 * Parameters (Arguments):
 * - options (Object, required):
 *   - owner (string, required): Repository owner (org or user).
 *   - repo (string, required): Repository name.
 *   - token (string, optional): Override token; else getDispatchToken().
 *   - fetchImpl (function, optional): (input, init) => Promise<Response>.
 *
 * Returns: { dispatchEvent, getOwner, getRepo }
 *
 * Raises / Errors: Throws Error when owner/repo/token is missing.
 *
 * Examples:
 * const client = createGitHubDispatchClient({ owner: 'acme', repo: 'hr' });
 */
function createGitHubDispatchClient(options = {}) {
  const {owner, repo, fetchImpl = globalThis.fetch} = options;

  if (!owner) {
    throw new Error('owner is required to create a GitHub dispatch client.');
  }

  if (!repo) {
    throw new Error('repo is required to create a GitHub dispatch client.');
  }

  const token = getDispatchToken(options);

  async function dispatchEvent(eventType, clientPayload) {
    return sendGitHubRequest(`/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      token,
      fetchImpl,
      body: {
        event_type: eventType,
        ...(clientPayload !== undefined && clientPayload !== null ? {client_payload: clientPayload} : {}),
      },
    });
  }

  return {
    dispatchEvent,
    getOwner: () => owner,
    getRepo: () => repo,
  };
}

/**
 * Brief Summary: Encode a resume Buffer for inclusion in a dispatch payload.
 * The default strategy is base64-in-payload (KR 3.2 default). If a
 * stagingPath is provided, the resume is written there and only the
 * reference is sent.
 *
 * Parameters (Arguments):
 * - content (Buffer, required): Resume bytes.
 * - options (Object, optional):
 *   - strategy ('base64' | 'stage', default: 'base64')
 *   - filename (string, optional): Original filename (included in payload).
 *   - stagingPath (string, optional): Required when strategy === 'stage'.
 *
 * Returns: Promise<{ encoding: string, content?: string, reference?: string, filename?: string }>
 *
 * Raises / Errors: Throws Error when strategy='stage' but stagingPath is missing.
 *
 * Examples:
 * const enc = await encodeResumeAttachment(buffer, { strategy: 'base64' });
 */
async function encodeResumeAttachment(content, options = {}) {
  const {strategy = 'base64', filename, stagingPath} = options;

  if (strategy === 'stage') {
    if (!stagingPath) {
      throw new Error('stagingPath is required when strategy is "stage".');
    }

    await fsp.writeFile(stagingPath, content);
    return {encoding: 'stage', reference: stagingPath, filename};
  }

  return {encoding: 'base64', content: content.toString('base64'), filename};
}

/**
 * Brief Summary: Build the `repository_dispatch` payload from a normalized
 * application envelope (see parser-service.js).
 *
 * Parameters (Arguments):
 * - application (object, required): Normalized application envelope.
 * - options (Object, optional):
 *   - eventType (string, optional): Defaults to DEFAULT_EVENT_TYPE.
 *   - encodingStrategy ('base64' | 'stage', default: 'base64').
 *   - stagingDir (string, optional): When strategy='stage', files go here.
 *
 * Returns: Promise<{ event_type: string, client_payload: object }>
 *
 * Raises / Errors: Throws Error when application is missing required fields.
 *
 * Examples:
 * const payload = await buildDispatchPayload(application);
 */
async function buildDispatchPayload(application, options = {}) {
  if (!application || typeof application !== 'object') {
    throw new Error('application is required to build a dispatch payload.');
  }

  const requiredFields = ['firstName', 'lastName', 'position', 'senderEmail', 'attachment'];
  const missingFields = requiredFields.filter((field) => application[field] === undefined || application[field] === null);

  if (missingFields.length) {
    throw new Error(`application is missing required field(s): ${missingFields.join(', ')}`);
  }

  const {firstName, lastName, position, senderEmail, body, attachment} = application;
  const encodingStrategy = options.encodingStrategy || 'base64';
  const stagingPath = encodingStrategy === 'stage' && options.stagingDir
    ? path.join(options.stagingDir, attachment.filename)
    : options.stagingPath;

  const encodedAttachment = await encodeResumeAttachment(attachment.content, {
    strategy: encodingStrategy,
    filename: attachment.filename,
    stagingPath,
  });

  return {
    event_type: options.eventType || DEFAULT_EVENT_TYPE,
    client_payload: {
      senderEmail,
      firstName,
      lastName,
      position,
      body: body || '',
      attachment: {
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        encoding: encodedAttachment.encoding,
        ...(encodedAttachment.content !== undefined ? {content: encodedAttachment.content} : {}),
        ...(encodedAttachment.reference !== undefined ? {reference: encodedAttachment.reference} : {}),
      },
    },
  };
}

/**
 * Brief Summary: Fire a dispatch event for a single normalized application.
 *
 * Parameters (Arguments):
 * - client (object, required): A client returned by createGitHubDispatchClient.
 * - application (object, required): Normalized envelope from parser-service.
 * - options (Object, optional): Forwarded to buildDispatchPayload.
 *
 * Returns: Promise<{ status: number, eventId?: string }>
 *
 * Raises / Errors: Throws DispatchError { status, reason } for auth (401),
 * rate limit (403 with x-ratelimit-remaining=0), payload too large (422),
 * and generic network failures. Each error includes a `reason` so the
 * listener can log + retry/hold accordingly.
 *
 * Examples:
 * await fireApplicationEvent(client, application);
 */
async function fireApplicationEvent(client, application, options = {}) {
  const payload = await buildDispatchPayload(application, options);

  try {
    await client.dispatchEvent(payload.event_type, payload.client_payload);
  } catch (err) {
    throw classifyDispatchError(err);
  }

  return {status: 204};
}

/**
 * Classifies a failed dispatch request into the reason categories documented
 * in docs/architecture.md and docs/runbook.md: 'auth', 'rate_limited',
 * 'payload_too_large', or 'network'.
 */
function classifyDispatchError(err) {
  const status = err && err.status;

  if (status === 401) {
    return new DispatchError('auth', {status, body: err.body});
  }

  if (status === 403) {
    const remaining = err.headers && typeof err.headers.get === 'function'
      ? err.headers.get('x-ratelimit-remaining')
      : undefined;
    return new DispatchError(remaining === '0' ? 'rate_limited' : 'auth', {status, body: err.body});
  }

  if (status === 422) {
    return new DispatchError('payload_too_large', {status, body: err.body});
  }

  return new DispatchError('network', {status, body: err && err.message});
}

/**
 * Public API exposed by this module.
 */
class DispatchError extends Error {
  constructor(reason, {status, body} = {}) {
    super(`${reason}${status ? ` (status ${status})` : ''}`);
    this.name = 'DispatchError';
    this.reason = reason;
    this.status = status;
    this.body = body;
  }
}

module.exports = {
  buildDispatchPayload,
  createGitHubDispatchClient,
  DEFAULT_EVENT_TYPE,
  DispatchError,
  encodeResumeAttachment,
  fireApplicationEvent,
  getDispatchToken,
};

if (require.main === module) {
  console.log('Firer service loaded. Import fireApplicationEvent from this module.');
}
