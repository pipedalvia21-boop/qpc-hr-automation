# Architecture Overview

The HR automation pipeline is split into three concerns, each isolated in its own service so they can be developed and tested independently.

## Components

### 1. IMAP listener (`services/new-message-detector.js` + `services/imap-service.js`)
- Owns the long-lived connection to the `intern-applications` mailbox.
- `imap-service.js` is a thin self-healing wrapper (connect, auto-reconnect on drop with exponential backoff, intentional disconnect).
- `new-message-detector.js` layers on:
  - **New-message detection (KR 1.2)** — IDLE when supported, polling fallback otherwise.
  - **Full message fetch (KR 1.3)** — returns a structured `{ uid, sender, subject, bodyText, bodyHtml, attachments[] }` object.
  - **Dedup (KR 1.4)** — persists processed UIDs to `.listener-processed-uids.json` so a restart does not re-fire the same message.

### 2. Parser (`services/parser-service.js`)
- Pure functions; no network access.
- Extracts `firstName`, `lastName`, and `position` from a subject like `First Last - [Position] Intern` (KR 2.1).
- Validates and produces a structured `ParserError { reason }` for malformed subjects (KR 2.2).
- Validates the attachment (PDF or DOCX; flags `no_attachment`, `unsupported_type`, or `ambiguous`) (KR 2.3).
- Combines the pieces into the normalized envelope used by every downstream step (KR 2.4).

### 3. Firer (`services/firer-service.js`)
- Wraps the GitHub REST API for `repository_dispatch`, built on top of the generic client in `services/github-service.js` (`createGitHubDispatchClient` calls `sendGitHubRequest` rather than making its own network calls) (KR 3.1).
- Encodes the resume (base64 in payload by default; staging path is a fallback for huge files) (KR 3.2).
- Builds and fires the payload under event type `intern-application-received` (KR 3.3).
- Maps non-2xx responses into a `DispatchError { reason }` so the listener can log and decide whether to retry or hold (KR 3.4). Classification reads the `status` and `headers` that `sendGitHubRequest` now attaches to its thrown errors, rather than parsing the error message.
- Reads its token from `GITHUB_DISPATCH_TOKEN` (see `docs/env-vars.md`) — the same variable `services/github-service.js` falls back to internally.

### 4. GitHub Actions workflow (`.github/workflows/drive-upload.yml`)
- Triggered by the `intern-application-received` event.
- Decodes the resume (KR 5.2), uploads it to Drive under `LastName_FirstName_Position_Date.pdf` (KR 5.3), and writes the shareable link to `$GITHUB_OUTPUT` (KR 5.4).

### 5. Coda row step (`scripts/coda-row-step.js`, `.github/workflows/coda-row.yml`)
- Looks up an existing row for `(email, position)` (KR 6.2) and either updates it (same link) or adds a new row (KR 6.1).
- Each Coda call is wrapped in `retry()` for transient failures (KR 7.4).

### 6. Notification (`.github/workflows/notify-failure.yml`)
- `workflow_run` listener posts to a Slack incoming webhook on any conclusion: failure (KR 8.1).

## Failure paths

- **Mailbox unreachable** — `imap-service` reconnects with exponential backoff (KR 1.1).
- **Malformed email** — parser throws a `ParserError`; the listener logs the reason and continues (KR 7.2).
- **Dispatch API failure** — `DispatchError` is classified (`auth` / `rate_limited` / `payload_too_large` / `network`); listener logs and (for transient classes) retries (KR 3.4, 7.4).
- **Drive / Coda API failure** — wrapped in `retry()`; final failure notifies Slack (KR 7.3, 7.4, 8.1).

## Where to look in the code

| KR | File |
|----|------|
| 1.1 | `services/imap-service.js` |
| 1.2, 1.3, 1.4 | `services/new-message-detector.js` |
| 2.1, 2.2, 2.3, 2.4 | `services/parser-service.js` |
| 3.1, 3.2, 3.3, 3.4 | `services/firer-service.js` |
| 4.1, 4.2, 4.3, 4.4 | `.github/workflows/ci.yml` |
| 5.1, 5.2, 5.3, 5.4 | `.github/workflows/drive-upload.yml`, `scripts/decode-resume.js`, `scripts/upload-resume.js` |
| 6.1, 6.2, 6.3 | `.github/workflows/coda-row.yml`, `scripts/coda-row-step.js` |
| 7.4 | `services/retry-service.js` |
| 8.1 | `services/notification-service.js`, `.github/workflows/notify-failure.yml` |
