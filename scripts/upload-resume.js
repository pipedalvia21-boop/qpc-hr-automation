/**
 * scripts/upload-resume.js
 *
 * Used by Epic 5 workflow KR 5.3 / KR 5.4. Reads a normalized envelope
 * (env or file), calls google-drive-service.js uploadFile, then calls
 * getShareLink, and writes the shareable link to $GITHUB_OUTPUT for the
 * downstream Coda step to pick up.
 *
 * Expected env:
 *   GITHUB_EVENT_PATH   Path to the dispatch payload.
 *   RESUME_PATH         Absolute path to the decoded resume on disk.
 *   GDRIVE_FOLDER_PATH  Slash-delimited folder path (default: '').
 */

const path = require('node:path');
const {uploadFile, getShareLink} = require('../services/google-drive-service');
const {retry} = require('../services/retry-service');

function buildResumeName(application) {
  // TODO(KR 5.3): implement the LastName_FirstName_Position_Date naming
  // convention. Date is YYYY-MM-DD so files sort lexically.
  return '';
}

async function main() {
  // TODO(KR 5.3, 5.4, 7.4):
  //   1. Read the dispatch payload from GITHUB_EVENT_PATH.
  //   2. Compute fileName = buildResumeName(application).
  //   3. Wrap uploadFile in retry() to handle transient failures.
  //   4. Wrap getShareLink in retry() too.
  //   5. Append `shareable_link=<url>` to $GITHUB_OUTPUT.
}

if (require.main === module) {
  main();
}
