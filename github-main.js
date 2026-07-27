/**
 * github-main.js
 *
 * Manual test runner for services/github-service.js (Sprint 34 KR "GitHub API Client
 * & Auth Setup"). Makes the DoD "test call": authenticates against the GitHub API using
 * GITHUB_DISPATCH_TOKEN from your .env and prints the authenticated identity. The token
 * itself is never printed.
 *
 * Usage:
 *   node github-main.js
 *
 * Requires GITHUB_DISPATCH_TOKEN in your .env (a PAT — classic with `repo` scope, or
 * fine-grained with Actions read/write on the target repo). See .env.example.
 */

require('dotenv').config();

const {getAuthenticatedUser} = require('./services/github-service');

async function main() {
  try {
    const user = await getAuthenticatedUser();
    console.log(`[github-main] Auth test call succeeded — authenticated as ${user.login} (id ${user.id}).`);
  } catch (err) {
    console.error('[github-main] GitHub auth test failed:', err && err.message ? err.message : err);
    console.error('[github-main] Check that GITHUB_DISPATCH_TOKEN is set in your .env and is valid (see .env.example).');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
