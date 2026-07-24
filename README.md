# QPC HR Automation

[![CI](https://github.com/qpulse/hr-automation/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

End-to-end pipeline that ingests intern applications from a shared mailbox, parses them into a structured envelope, fires a `repository_dispatch` event so a GitHub Actions workflow can upload the resume to Google Drive and add a row in Coda.

## Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  IMAP listener   │───▶│     Parser       │───▶│  GitHub firer    │
│ (listener-       │    │  (parser-        │    │  (firer-         │
│  service.js)     │    │   service.js)    │    │   service.js)    │
└──────────────────┘    └──────────────────┘    └────────┬─────────┘
                                                          │ repository_dispatch
                                                          ▼
                                            ┌──────────────────────────┐
                                            │  GitHub Actions workflow │
                                            │  (drive-upload.yml)      │
                                            └────────┬─────────────────┘
                                                     │
                                ┌────────────────────┴───────────────────┐
                                ▼                                        ▼
                    ┌──────────────────────┐               ┌──────────────────────┐
                    │ Google Drive upload  │               │   Coda row add/update │
                    │ (KR 5.1–5.4)         │               │   (KR 6.1–6.3)        │
                    └──────────────────────┘               └──────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for the full flow including failure paths and the Slack notification step.

## Running tests locally

```bash
npm install
npm test            # runs every test/ file with node:test
npx eslint services/ test/ *.js scripts/   # KR 4.4
```

Detailed setup: [docs/local-testing.md](docs/local-testing.md).

## Environment variables & secrets

Every required value, where it comes from, and how to rotate it:
[docs/env-vars.md](docs/env-vars.md).

## Diagnosing failed runs

The on-call runbook: [docs/runbook.md](docs/runbook.md).

## Project layout

| Path | Purpose |
|------|---------|
| `imap-main.js` | Smoke-test the IMAP connection. |
| `coda-main.js` | Demo CLI for the Coda service. |
| `listener-main.js` | Run the IMAP listener end-to-end. |
| `parser-main.js` | Run the parser on a JSON file. |
| `firer-main.js` | Fire a dispatch event from a JSON file. |
| `pipeline-main.js` | Full E2E smoke test (KR 7.1). |
| `services/` | Pure modules: imap, coda, drive, sender-email, parser, firer, listener, notification, retry. |
| `test/` | Unit + integration tests (one per epic). |
| `scripts/` | Helpers invoked by the GitHub Actions workflows. |
| `google-app-script/Code.gs` | The Coda-driven Apps Script for outbound HR emails. |
| `.github/workflows/` | CI, Drive upload, Coda row, failure notification. |
