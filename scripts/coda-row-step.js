/**
 * scripts/coda-row-step.js
 *
 * Used by Epic 6 workflow (KRs 6.1, 6.2, 6.3). Given a normalized
 * envelope + a Drive shareable link, either add a new row in the Coda
 * table or update the existing row for the same (email, position) pair.
 *
 * Expected env:
 *   GITHUB_EVENT_PATH  Path to the dispatch payload.
 *   SHAREABLE_LINK     Output of the Drive upload step.
 *   CODA_API_TOKEN     Secret.
 *   CODA_DOC_ID        Secret.
 *   CODA_TABLE_ID      Secret.
 */

const {addRowToTable, findUniqueRowByLookup, updateRowInTableByLookup} = require('../services/coda-service');
const {retry} = require('../services/retry-service');

async function main() {
  // TODO(KR 6.1, 6.2, 6.3, 7.4):
  //   1. Read the dispatch payload from GITHUB_EVENT_PATH.
  //   2. Try findUniqueRowByLookup(docId, tableId, 'Email', application.senderEmail).
  //   3. If found -> updateRowInTableByLookup with the new shareable link.
  //      If not    -> addRowToTable.
  //   4. Wrap each Coda call in retry() for transient failures.
  //   5. Log the resulting row id (KR 6.3) to stdout. Never log the token.
}

if (require.main === module) {
  main();
}
