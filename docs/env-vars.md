# Environment Variables & Secrets

This document lists every environment variable and GitHub secret the project needs, what it is for, and where to obtain / rotate it. **Never put a real secret value in this file.**

## Local development (`.env`)

| Variable | Purpose | Where to obtain |
|----------|---------|-----------------|
| `IMAP_HOST` | IMAP server hostname. | Mail provider — Titan (`imap.titan.email`) for prod, Gmail (`imap.gmail.com`) for the test mailbox. |
| `IMAP_PORT` | IMAP port (default 993). | Provider docs. |
| `IMAP_USER` | Mailbox login. | The HR mailbox owner. |
| `IMAP_PASS` | App password. | Gmail app passwords; Titan mailbox password. |
| `IMAP_TLS` | `true` to use implicit TLS. | Default is true when port is 993. |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail account used by `sender-email-service.js`. | Gmail app password. |
| `CODA_API_TOKEN` | Bearer token for the Coda REST API. | Coda account settings → API tokens. |
| `GITHUB_DISPATCH_TOKEN` | PAT with `repo` scope used to fire `repository_dispatch`. | GitHub → Settings → Developer settings → PAT. |
| `SLACK_WEBHOOK_URL` | Incoming webhook for failure alerts. | Slack → Apps → Incoming webhooks. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to a service-account JSON. | Google Cloud Console → IAM → Service accounts. |

## GitHub repository secrets

Used by the Actions workflows under `.github/workflows/`:

| Secret | Used by | Purpose |
|--------|---------|---------|
| `CODA_API_TOKEN` | `coda-row.yml` | Calls the Coda API from the runner. |
| `CODA_DOC_ID` | `coda-row.yml` | The Coda doc to write into. |
| `CODA_TABLE_ID` | `coda-row.yml` | The Coda table to write into. |
| `GDRIVE_SERVICE_ACCOUNT_KEY_PATH` | `drive-upload.yml` | Path on the runner to a service-account JSON (typically `secrets/<key>.json`). |
| `SLACK_WEBHOOK_URL` | `notify-failure.yml` | Posts alerts when a run fails. |

## GitHub repository variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `GDRIVE_FOLDER_PATH` | `drive-upload.yml` | Slash-delimited target folder inside the shared Drive. |

## Rotation

- **Coda token** — Generate a new one in Coda → API tokens. Update `CODA_API_TOKEN` in `.env` (and the repo secret) and redeploy/restart. The old token can be revoked at any time.
- **GitHub PAT** — `Settings → Developer settings → Personal access tokens → Regenerate`. Update `GITHUB_DISPATCH_TOKEN` and any script that injects it.
- **Google service account** — Create a new key in Google Cloud Console, save the JSON, replace the file referenced by `GDRIVE_SERVICE_ACCOUNT_KEY_PATH`.
- **Slack webhook** — Recreate the webhook in Slack, update `SLACK_WEBHOOK_URL`.
- **Mailbox password** — Rotate in the provider's admin console, then update `IMAP_PASS` and `EMAIL_PASS`.
