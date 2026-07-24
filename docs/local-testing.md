# Local Testing Instructions

A new developer should be able to follow these steps from a clean clone and run the full test suite without any extra guidance.

## Prerequisites

- Node.js 20+ (`node --version`).
- A Gmail account you control, with an [app password](https://support.google.com/accounts/answer/185833) enabled — this is used for both the IMAP mailbox and the sender-email service in dev.

## Setup

```bash
git clone <this-repo>
cd hr-automation
cp .env.example .env
# Fill in IMAP_USER / IMAP_PASS / EMAIL_USER / EMAIL_PASS in .env.
# (Leave GITHUB_DISPATCH_TOKEN / CODA_API_TOKEN / SLACK_WEBHOOK_URL blank for
#  tests that don't hit those services — node:test will skip them.)
npm install
```

## Run the test suite

```bash
npm test
```

The script runs every file under `test/` with `node --test`. Tests are split by concern:

- `test/imap-service.test.js` — uses a fake ImapFlow client; no network.
- `test/coda-service.test.js` — uses a fake `fetch`; no network.
- `test/google-drive/*.test.js` — uses a fake Drive API; no network.
- `test/parser-service.test.js` — pure functions.
- `test/new-message-detector.test.js` — uses a fake ImapFlow client.
- `test/firer-service.test.js` — uses a fake `fetch`.
- `test/notification-service.test.js` — uses a fake `fetch`.
- `test/retry-service.test.js` — pure functions.
- `test/coda-row-integration.test.js` — uses a fake `fetch` against a sandbox-shaped Coda API.
- `test/pipeline-e2e.test.js` — fixture-based, no external services.
- `test/google-drive/upload-integration.test.js` — uses a fake Drive API; writes a tmp file.

Total runtime is a few seconds. No live mailbox or external service is required for the default suite.

## Smoke tests that DO touch the network

These are documented for completeness; CI does not run them.

```bash
# Connect to the configured mailbox, print INBOX status, exit.
node imap-main.js

# Stay connected. Drop your network for a few seconds and watch the
# auto-reconnect logic kick in.
node imap-main.js --watch

# End-to-end listener + parser + firer, against a real mailbox and
# real GitHub repo. Send a test email to the configured mailbox
# while this is running.
node listener-main.js
```

## Lint

```bash
npx eslint services/ test/ *.js scripts/
```

## Verifying changes against a real dispatch

If you have a sandbox GitHub repo:

```bash
# Build (but don't fire) a payload from a fixture
node firer-main.js --dry-run ./test/sample-application.json

# Fire for real
node firer-main.js ./test/sample-application.json \
  --owner <sandbox-org> --repo <sandbox-repo>
```
