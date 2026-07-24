# HR Automation Project — Granular Key Results (4–8 hrs each)

**Context:** Each KR below is sized to be completable in a single 4–8 hour block. They're grouped under the same 8 epics as before (which map to Phase 2 and Phase 3), so you can still track progress at the epic level while assigning/estimating at the KR level. Sprint boundaries are no longer assumed — group these into sprints however fits your team's velocity.

---

## Epic 1: Email Listener (Phase 2)

### KR 1.1: IMAP Connection & Authentication
- **Description:** Set up the IMAP client (`node-imap` or `imapflow`), connect to the intern-applications mailbox using credentials from environment variables, and confirm a stable connection with reconnect-on-drop handling.
- **Duration:** 5 hours
- **Priority:** High
- **Definition of Done:** Client connects successfully using env-based credentials; connection errors are caught and logged; a dropped connection triggers a reconnect attempt.
- **Phase:** 2

### KR 1.2: New-Message Detection Loop
- **Description:** Implement the IDLE/polling mechanism that detects newly arrived unread messages in the mailbox.
- **Duration:** 6 hours
- **Priority:** High
- **Definition of Done:** New unread messages are detected within the defined interval/IDLE window; detection logic is isolated in a testable function; a manual test (send a real email) confirms detection.
- **Phase:** 2

### KR 1.3: Fetch Full Message Content
- **Description:** For each detected message, retrieve the sender address, subject, plain-text/HTML body, and all attachments as buffers.
- **Duration:** 6 hours
- **Priority:** High
- **Definition of Done:** Function returns a structured raw-message object with sender, subject, body, and an array of attachment buffers with filenames/mime types.
- **Phase:** 2

### KR 1.4: Mark-as-Processed / Deduplication
- **Description:** After a message is handed off, flag/label it (or track its UID) so it isn't reprocessed on the next poll cycle.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Previously processed messages are never re-fetched or re-fired; a restart of the listener does not reprocess old mail.
- **Phase:** 2

### KR 1.5: Unit Tests for Listener
- **Description:** Write unit tests against a mocked IMAP server covering connection handling, new-message detection, and attachment retrieval.
- **Duration:** 6 hours
- **Priority:** Medium
- **Definition of Done:** Test suite covers happy path, connection failure, and empty-mailbox cases; all tests pass in isolation (no live mailbox needed).
- **Phase:** 2

*Epic 1 total: ~27 hours*

---

## Epic 2: Email Parser (Phase 2)

### KR 2.1: Subject Line Parser
- **Description:** Implement regex-based extraction of first name, last name, and position from subject lines formatted as `First Last - [Position] Intern`.
- **Duration:** 5 hours
- **Priority:** High
- **Definition of Done:** Given a valid subject string, function returns `{ firstName, lastName, position }` correctly for a range of sample subjects (including names with hyphens/apostrophes).
- **Phase:** 2

### KR 2.2: Malformed Subject Handling
- **Description:** Add validation and logging for subjects that don't match the expected format (missing name, missing "Intern" keyword, extra text, etc.).
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Malformed subjects produce a clear, logged rejection reason rather than a thrown exception or silent bad data; rejected emails are flagged for manual review.
- **Phase:** 2

### KR 2.3: Attachment Validation
- **Description:** Confirm a resume attachment exists on the message and is a supported file type (PDF/DOCX); flag emails with no attachment or unsupported types.
- **Duration:** 5 hours
- **Priority:** High
- **Definition of Done:** Function correctly identifies a valid resume attachment among any others; missing/invalid attachments are flagged with a specific reason.
- **Phase:** 2

### KR 2.4: Normalized Output Builder
- **Description:** Combine parsed subject data, body text, and validated attachment into a single normalized JSON object ready for downstream use.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Output matches the agreed schema: `{ senderEmail, firstName, lastName, position, body, attachment }`; schema is documented in code/README.
- **Phase:** 2

### KR 2.5: Unit Tests for Parser
- **Description:** Write unit tests covering valid subjects, malformed subjects, missing attachments, and multiple-attachment edge cases.
- **Duration:** 6 hours
- **Priority:** Medium
- **Definition of Done:** All identified edge cases have a corresponding passing test; test file runs independently of the listener.
- **Phase:** 2

*Epic 2 total: ~24 hours*

---

## Epic 3: GitHub Actions Firer Service (Phase 2)

### KR 3.1: GitHub API Client & Auth Setup
- **Description:** Set up an authenticated GitHub API client (PAT or GitHub App token from env/secrets) with a thin wrapper for making dispatch calls.
- **Duration:** 4 hours
- **Priority:** High
- **Definition of Done:** Client successfully authenticates against the GitHub API in a test call; token is never hardcoded or logged.
- **Phase:** 2

### KR 3.2: Attachment Encoding/Staging Decision & Implementation
- **Description:** Decide how the resume binary will reach the workflow (base64 in payload vs. temporary staging location) given `repository_dispatch` payload size limits, and implement the chosen approach.
- **Duration:** 6 hours
- **Priority:** High
- **Definition of Done:** Approach is implemented and documented with rationale; a sample resume file successfully makes it from the firer to a form the workflow can consume.
- **Phase:** 2

### KR 3.3: Payload Builder & Dispatch Function
- **Description:** Build the function that assembles the normalized email data (plus encoded/staged attachment reference) into a `repository_dispatch` payload and fires it under a custom event type (e.g. `intern-application-received`).
- **Duration:** 5 hours
- **Priority:** High
- **Definition of Done:** Function successfully triggers a `repository_dispatch` event visible in the repo's Actions/event log with the correct event type and payload shape.
- **Phase:** 2

### KR 3.4: Error Handling for Dispatch Failures
- **Description:** Add handling and logging for auth errors, rate limits, and payload-too-large errors so a failed fire doesn't silently drop the email.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Simulated failure cases (bad token, oversized payload) produce clear log output and a defined retry/failure path (even if that path is just "alert and hold for manual retry").
- **Phase:** 2

### KR 3.5: Mocked Integration Tests for Firer
- **Description:** Write tests that mock the GitHub API and verify the firer sends the correct event type and payload for a range of inputs.
- **Duration:** 5 hours
- **Priority:** Medium
- **Definition of Done:** Tests confirm correct payload shape, correct event type, and correct handling of a simulated API error — all without hitting the real GitHub API.
- **Phase:** 2

*Epic 3 total: ~24 hours*

---

## Epic 4: CI Workflows (Phase 2)

### KR 4.1: Base CI Workflow File
- **Description:** Create `.github/workflows/ci.yml` triggered on `push` and `pull_request` to `main`, with steps to check out code and install dependencies.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Workflow runs automatically on a test push/PR and completes the install step successfully.
- **Phase:** 2

### KR 4.2: Wire In Existing Service Tests
- **Description:** Add the test-run step for the already-implemented email, Coda, and Drive service test files.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** CI run shows pass/fail results for all existing test files; a deliberately broken test causes the workflow to fail.
- **Phase:** 2

### KR 4.3: Wire In New Module Tests
- **Description:** Add test-run steps for the new listener, parser, and firer test suites (from Epics 1–3) once they exist.
- **Duration:** 3 hours
- **Priority:** Medium
- **Definition of Done:** CI run includes and reports on listener/parser/firer tests alongside existing service tests.
- **Phase:** 2

### KR 4.4: Linting Step (if configured)
- **Description:** Add a lint step to the CI workflow using the project's existing linter config (ESLint or similar); if none exists, add a minimal one.
- **Duration:** 4 hours
- **Priority:** Low
- **Definition of Done:** Lint step runs on every push/PR and fails the workflow on lint errors.
- **Phase:** 2

### KR 4.5: CI Documentation
- **Description:** Add a README section (and status badge) explaining what the CI workflow checks and how to run the same checks locally.
- **Duration:** 3 hours
- **Priority:** Low
- **Definition of Done:** README includes a working CI badge and a short "running tests locally" section.
- **Phase:** 2

*Epic 4 total: ~18 hours*

---

## Epic 5: Drive Upload Workflow Step (Phase 3)

### KR 5.1: Workflow Skeleton for Dispatch Event
- **Description:** Create the GitHub Actions workflow YAML that triggers on the `intern-application-received` custom event and checks out the repo/installs dependencies.
- **Duration:** 4 hours
- **Priority:** High
- **Definition of Done:** Workflow triggers correctly when the firer sends a test dispatch event; job reaches the install step successfully.
- **Phase:** 3

### KR 5.2: Decode/Retrieve Resume from Payload
- **Description:** Write the script step that extracts the resume file from the dispatch payload (decoding base64 or fetching from the staged location decided in KR 3.2).
- **Duration:** 5 hours
- **Priority:** High
- **Definition of Done:** Script reliably produces a valid, readable resume file on the runner's filesystem from a test payload.
- **Phase:** 3

### KR 5.3: Invoke Drive Upload with Naming Convention
- **Description:** Call the existing Drive service's upload function with the decoded resume, using a predictable naming scheme (e.g. `LastName_FirstName_Position_Date`).
- **Duration:** 5 hours
- **Priority:** High
- **Definition of Done:** A test resume uploads to the correct Drive folder with the expected filename format.
- **Phase:** 3

### KR 5.4: Retrieve Shareable Link & Secrets Config
- **Description:** Call the existing Drive service's get-shareable-link function on the uploaded file, and configure Google credentials as GitHub encrypted secrets.
- **Duration:** 4 hours
- **Priority:** High
- **Definition of Done:** Workflow outputs a valid, working shareable link for the uploaded file; no credentials appear in plaintext anywhere in the repo or logs.
- **Phase:** 3

### KR 5.5: Integration Test for Upload + Link
- **Description:** Write an integration test (runnable locally or as a test workflow) that uploads a sample file and confirms a working shareable link is returned.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Test passes against a real (sandbox/test) Drive folder and cleans up after itself.
- **Phase:** 3

*Epic 5 total: ~22 hours*

---

## Epic 6: Coda Row Workflow Step (Phase 3)

### KR 6.1: Add-Row Step with Field Mapping
- **Description:** Add the workflow step that calls the existing Coda "add row" function, mapping sender name, email, position, and Drive link to the correct table columns.
- **Duration:** 6 hours
- **Priority:** High
- **Definition of Done:** A test payload produces a correctly populated new row in a test Coda table with all fields mapped to the right columns.
- **Phase:** 3

### KR 6.2: Duplicate Detection / Update Path
- **Description:** Before adding a row, use the existing lookup function to check whether a row for that sender/position already exists; if so, route to the update function instead of creating a duplicate.
- **Duration:** 6 hours
- **Priority:** Medium
- **Definition of Done:** Submitting the same sender/position twice results in one updated row, not two separate rows; logic is documented in code comments.
- **Phase:** 3

### KR 6.3: Coda Secrets & Error Logging
- **Description:** Store the Coda API token as a GitHub encrypted secret and add logging that reports success (with row ID) or failure (with reason) for each write attempt.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Token never appears in plaintext; workflow logs clearly show which row was created/updated or why a write failed.
- **Phase:** 3

### KR 6.4: Integration Test — Row Creation
- **Description:** Write an integration test confirming a fresh payload creates a correctly populated new row in a test Coda doc.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Test passes against a real test Coda table and cleans up the created row afterward.
- **Phase:** 3

### KR 6.5: Integration Test — Update Path
- **Description:** Write an integration test confirming a duplicate submission updates the existing row rather than creating a new one.
- **Duration:** 4 hours
- **Priority:** Medium
- **Definition of Done:** Test passes and confirms row count stays at one after two submissions for the same sender/position.
- **Phase:** 3

*Epic 6 total: ~24 hours*

---

## Epic 7: Full E2E Testing & Error Handling (Phase 3)

### KR 7.1: Manual Dry-Run of Full Pipeline
- **Description:** Send one real (or realistic sandbox) email through the entire pipeline — listener → parser → firer → Drive upload → Coda row — and confirm the final result is correct end to end.
- **Duration:** 6 hours
- **Priority:** High
- **Definition of Done:** A single test email results in a correct Coda row with a working Drive link, observed and documented step-by-step.
- **Phase:** 3

### KR 7.2: Error Handling — Parsing Edge Cases
- **Description:** Confirm and, where needed, improve defined behavior for malformed subject lines and missing/unsupported attachments as they flow through the full pipeline (not just in isolated unit tests).
- **Duration:** 5 hours
- **Priority:** Medium
- **Definition of Done:** A malformed-subject email and a no-attachment email both produce a clear, logged, non-crashing outcome when sent through the real pipeline.
- **Phase:** 3

### KR 7.3: Error Handling — External API Failures
- **Description:** Test and handle failure scenarios for the GitHub, Drive, and Coda APIs (e.g. simulate a bad token or downed endpoint) so a failure at any stage is logged and doesn't silently lose the email data.
- **Duration:** 6 hours
- **Priority:** Medium
- **Definition of Done:** Each of the three external-API failure points has a reproducible test case and a defined, logged failure behavior.
- **Phase:** 3

### KR 7.4: Retry Logic for Transient Failures
- **Description:** Add retry-with-backoff logic (or equivalent alerting if retry isn't feasible) for transient failures at the Drive/Coda/GitHub API steps.
- **Duration:** 6 hours
- **Priority:** Medium
- **Definition of Done:** A simulated transient failure (e.g. one failed call followed by a successful one) is automatically retried and succeeds without manual intervention.
- **Phase:** 3

### KR 7.5: Runbook for Diagnosing Failed Runs
- **Description:** Write a short runbook describing how to read the Actions logs to figure out where and why a pipeline run failed.
- **Duration:** 4 hours
- **Priority:** Low
- **Definition of Done:** Runbook is added to the README/docs and walks through at least one real example of a failed run and how it was diagnosed.
- **Phase:** 3

### KR 7.6: Regression Pass & Cleanup
- **Description:** Do a final pass across all pipeline stages to remove dead code, tighten logging, and confirm nothing regressed while error handling was added.
- **Duration:** 5 hours
- **Priority:** Low
- **Definition of Done:** Full test suite (unit + integration) passes; no leftover debug logging or TODOs blocking production use.
- **Phase:** 3

*Epic 7 total: ~32 hours*

---

## Epic 8: Monitoring & Handoff Documentation (Phase 3)

### KR 8.1: Failure Notification
- **Description:** Add a notification step (Slack or email webhook) that fires automatically when the GitHub Actions workflow fails at any stage.
- **Duration:** 5 hours
- **Priority:** Low
- **Definition of Done:** A deliberately failed test run triggers a real notification to the configured channel/address.
- **Phase:** 3

### KR 8.2: Architecture Overview Documentation
- **Description:** Write a README section (with a simple diagram) describing how the pieces fit together: listener → parser → firer → GitHub Actions → Drive → Coda.
- **Duration:** 4 hours
- **Priority:** Low
- **Definition of Done:** A new team member unfamiliar with the project can read the section and describe the flow back correctly.
- **Phase:** 3

### KR 8.3: Environment Variables & Secrets Documentation
- **Description:** Document every environment variable and GitHub secret required across all services, what each is for, and where to obtain/rotate it.
- **Duration:** 3 hours
- **Priority:** Low
- **Definition of Done:** A checklist exists listing every required env var/secret by name and purpose, with no actual secret values included.
- **Phase:** 3

### KR 8.4: Local Testing Instructions
- **Description:** Write clear instructions for running the listener, parser, and full test suite locally, including any mock/sandbox setup needed.
- **Duration:** 4 hours
- **Priority:** Low
- **Definition of Done:** Following the instructions from a clean clone, a new developer can run the full test suite locally without additional guidance.
- **Phase:** 3

*Epic 8 total: ~16 hours*

---

## Summary

| Epic | # of KRs | Total Hours | Phase |
|------|----------|-------------|-------|
| 1. Email Listener | 5 | ~27h | 2 |
| 2. Email Parser | 5 | ~24h | 2 |
| 3. GitHub Actions Firer | 5 | ~24h | 2 |
| 4. CI Workflows | 5 | ~18h | 2 |
| 5. Drive Upload Workflow | 5 | ~22h | 3 |
| 6. Coda Row Workflow | 5 | ~24h | 3 |
| 7. E2E Testing & Error Handling | 6 | ~32h | 3 |
| 8. Monitoring & Docs | 4 | ~16h | 3 |
| **Total** | **40** | **~187h** | — |

**Sequencing notes:**
- Within Epic 1 and Epic 2, KRs are roughly sequential (connection → detection → fetch → dedupe → tests).
- KR 3.1–3.2 can start once Epic 2's output schema (KR 2.4) is settled, even before all of Epic 2's tests are done.
- Epic 4 KRs can run in parallel with Epics 1–3 once there's at least one test file to wire in.
- Epic 5 and Epic 6 both depend on Epic 3 (the firer) being functional, but can be worked in parallel by two people once that dependency is met.
- Epic 7 depends on Epics 5 and 6 both being functional; Epic 8 can start in parallel with Epic 7 since it's mostly independent documentation/monitoring work.
