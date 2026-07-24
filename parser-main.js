/**
 * parser-main.js
 *
 * CLI entry point for parser-service.js. Reads a JSON file (default:
 * ./test/sample-email.json) shaped like a raw message, runs it through
 * parseEmail, and prints the normalized envelope. Useful for iterating
 * on subject-line regexes without a live IMAP connection.
 *
 * Usage:
 *   node parser-main.js                                # default sample
 *   node parser-main.js path/to/raw-message.json
 *   node parser-main.js --malformed path/to/raw.json   # expect ParserError
 */

require('dotenv').config();

const fs = require('node:fs/promises');
const {parseEmail, ParserError} = require('./services/parser-service');

async function main() {
  // TODO(KR 2.1–2.5):
  //   1. Read the file path from process.argv (after the script name),
  //      or ./test/sample-email.json when none is provided.
  //   2. JSON.parse it as a raw message.
  //   3. Call parseEmail(raw) and console.log the normalized envelope.
  //   4. If --malformed is set, expect a ParserError and exit non-zero
  //      when one is not thrown (and vice versa).
}

if (require.main === module) {
  main();
}
