/**
 * pipeline-main.js
 *
 * End-to-end smoke runner used by KR 7.1 (full E2E dry run) and Epic 7
 * regression tests. Reads a fixture file and exercises the full
 * pipeline: parser -> firer -> (mock) Drive upload -> (mock) Coda row.
 *
 * Usage:
 *   node pipeline-main.js                                 # default fixture
 *   node pipeline-main.js path/to/fixture.json
 *   node pipeline-main.js --mock-externals path/to/...    # never hit real APIs
 */

require('dotenv').config();

async function main() {
  // TODO(KR 7.1, 7.2, 7.3, 7.6):
  //   1. Read the fixture from argv (default ./test/e2e-fixture.json).
  //   2. Build a fake listener that emits the fixture's raw message once.
  //   3. Run the pipeline with --mock-externals replacing Drive/Coda with
  //      in-memory doubles so the smoke test is hermetic.
  //   4. Print a pass/fail summary and exit non-zero on the first failure.
}

if (require.main === module) {
  main();
}
