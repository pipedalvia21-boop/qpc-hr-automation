/**
 * firer-main.js
 *
 * CLI entry point for firer-service.js. Reads a normalized application envelope
 * (default: ./test/sample-application.json) and fires an `intern-application-received`
 * repository_dispatch event for it — the event the Drive Upload workflow listens for.
 * Useful for end-to-end testing without waiting on the IMAP listener (KR 3.2 DoD:
 * "a sample resume successfully makes it from the firer to the workflow").
 *
 * The fixture stores the resume bytes as a base64 string (JSON can't hold a Buffer);
 * this runner rehydrates attachment.content into a Buffer, the shape firer-service
 * expects. The default base64 encoding matches what the workflow's decode-resume.js
 * step decodes.
 *
 * Usage:
 *   node firer-main.js                                   # fire the default sample
 *   node firer-main.js path/to/application.json          # fire a specific application
 *   node firer-main.js --dry-run                         # build + print payload, do NOT POST
 *   node firer-main.js --owner OWNER --repo REPO         # override target repo
 *
 * Env: GITHUB_DISPATCH_TOKEN (required to fire), GITHUB_OWNER / GITHUB_REPO
 * (target repo, unless passed via --owner/--repo). See .env.example.
 */

require('dotenv').config();

const fs = require('node:fs/promises');
const {
  createGitHubDispatchClient,
  fireApplicationEvent,
  buildDispatchPayload,
  DEFAULT_EVENT_TYPE,
} = require('./services/firer-service');

const DEFAULT_APPLICATION_PATH = './test/sample-application.json';

/** Parse argv into { dryRun, owner, repo, file }. */
function parseArgs(argv) {
  const args = {dryRun: false, owner: undefined, repo: undefined, file: DEFAULT_APPLICATION_PATH};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--owner') {
      args.owner = argv[i += 1];
    } else if (arg === '--repo') {
      args.repo = argv[i += 1];
    } else {
      positionals.push(arg);
    }
  }

  if (positionals.length) {
    args.file = positionals[0];
  }

  return args;
}

/**
 * Load a normalized application envelope from a JSON file, rehydrating the
 * base64-encoded attachment content back into a Buffer.
 */
async function loadApplication(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const application = JSON.parse(raw);

  if (application.attachment && typeof application.attachment.content === 'string') {
    application.attachment.content = Buffer.from(application.attachment.content, 'base64');
  }

  return application;
}

/** Replace the base64 blob with a short summary so the payload is readable in logs. */
function summarizePayload(payload) {
  const clone = JSON.parse(JSON.stringify(payload));
  const attachment = clone.client_payload && clone.client_payload.attachment;

  if (attachment && typeof attachment.content === 'string') {
    attachment.content = `<base64: ${attachment.content.length} chars>`;
  }

  return clone;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let application;
  try {
    application = await loadApplication(args.file);
  } catch (err) {
    console.error(`[firer-main] Could not read application from ${args.file}:`, err && err.message ? err.message : err);
    process.exitCode = 2;
    return;
  }

  // Dry run: build and show the payload without any network call or token.
  if (args.dryRun) {
    const payload = await buildDispatchPayload(application);
    console.log('[firer-main] --dry-run: built dispatch payload (not sent):');
    console.log(JSON.stringify(summarizePayload(payload), null, 2));
    return;
  }

  const owner = args.owner || process.env.GITHUB_OWNER;
  const repo = args.repo || process.env.GITHUB_REPO;

  if (!owner || !repo) {
    console.error('[firer-main] Target repo is required. Pass --owner/--repo or set GITHUB_OWNER/GITHUB_REPO in your .env.');
    process.exitCode = 2;
    return;
  }

  let client;
  try {
    client = createGitHubDispatchClient({owner, repo});
  } catch (err) {
    console.error('[firer-main]', err && err.message ? err.message : err);
    console.error('[firer-main] Set GITHUB_DISPATCH_TOKEN in your .env (see .env.example).');
    process.exitCode = 2;
    return;
  }

  try {
    const result = await fireApplicationEvent(client, application);
    console.log(
      `[firer-main] Dispatch accepted (status ${result.status}). Fired '${DEFAULT_EVENT_TYPE}' to ${owner}/${repo} — ` +
      'the Drive Upload workflow should now pick it up.'
    );
  } catch (err) {
    const reason = err && err.reason ? err.reason : 'unknown';
    console.error(`[firer-main] Dispatch failed (${reason}):`, err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
