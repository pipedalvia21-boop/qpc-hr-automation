/**
 * firer-main.js
 *
 * CLI entry point for firer-service.js. Reads a normalized envelope
 * (default: ./test/sample-application.json) and fires a
 * `repository_dispatch` event for it. Useful for end-to-end testing
 * without waiting on the IMAP listener.
 *
 * Usage:
 *   node firer-main.js                              # default sample
 *   node firer-main.js path/to/application.json
 *   node firer-main.js --dry-run path/to/...         # build payload, do not POST
 */

require('dotenv').config();

const fs = require('node:fs/promises');
const {createGitHubDispatchClient, fireApplicationEvent, buildDispatchPayload} = require('./services/firer-service');

async function main() {
  // TODO(KR 3.1–3.5):
  //   1. Resolve owner/repo from --owner / --repo or env (GITHUB_OWNER,
  //      GITHUB_REPO). Read the application from the file path on argv.
  //   2. Build the dispatch client.
  //   3. If --dry-run, just call buildDispatchPayload and console.log it.
  //   4. Otherwise call fireApplicationEvent and log the resulting status.
}

if (require.main === module) {
  main();
}
