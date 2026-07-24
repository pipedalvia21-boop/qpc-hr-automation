/**
 * listener-main.js
 *
 * CLI entry point that wires services/new-message-detector.js to the parser +
 * firer. Send a test email to the configured mailbox and you should see
 * a normalized envelope handed to the GitHub dispatch API.
 *
 * Usage:
 *   node listener-main.js            Start the listener; runs until SIGINT.
 *   node listener-main.js --once     Process currently-pending messages and exit.
 *   node listener-main.js --dry-run  Print normalized envelopes without firing.
 */

require('dotenv').config();

const {createImapService} = require('./services/imap-service');
const {runListener} = require('./services/new-message-detector');
const {parseEmail, ParserError} = require('./services/parser-service');
const {createGitHubDispatchClient, fireApplicationEvent} = require('./services/firer-service');
const {sendFailureNotification} = require('./services/notification-service');

async function main() {
  // TODO(KR 1.2–3.4, 7.2, 7.3, 8.1):
  //   1. Parse --once / --dry-run from process.argv.
  //   2. Build a handler = async (raw) => {
  //        try { const app = await parseEmail(raw); if (!dryRun) await fireApplicationEvent(client, app); }
  //        catch (e) { if (e instanceof ParserError) { log("flagged for review", e.reason); return; }
  //                    await sendFailureNotification({ stage: 'listener', message: e.message, ... }); }
  //      }
  //   3. Call runListener(handler) and install a SIGINT handler that
  //      disconnects the IMAP service cleanly.
}

if (require.main === module) {
  main();
}
