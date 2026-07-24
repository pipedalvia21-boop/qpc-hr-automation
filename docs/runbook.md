# On-Call Runbook — Diagnosing Failed Pipeline Runs

A step-by-step guide for figuring out where and why a run failed. Most issues fall into one of three categories: parser, dispatch, or downstream API.

## 1. Find the failing run

- Open the Actions tab in the GitHub repo.
- The most recent failed run is at the top of the **Failed** filter.
- Click into it. The run summary lists every job and whether it passed or failed.

## 2. Identify which stage failed

The pipeline is split across three workflows:

| Workflow | Trigger | Stages |
|----------|---------|--------|
| `ci.yml` | push / PR | unit tests + lint |
| `drive-upload.yml` | `repository_dispatch` | decode → upload → link |
| `coda-row.yml` | `repository_dispatch` (or manual) | lookup → add or update |

If `ci.yml` failed, jump to **Test failures**. Otherwise, look at the job logs for the workflow that was triggered by the dispatch event.

## 3. Drive upload failures

Common log lines and what they mean:

- `DispatchError: auth (status 401)` — the `GITHUB_DISPATCH_TOKEN` PAT is missing the `repo` scope or has been revoked. Rotate the token and update the secret.
- `DispatchError: rate_limited (status 403)` — GitHub rate limit hit. Wait for the window to reset (see the `x-ratelimit-reset` header) or back off using the retry helper.
- `DispatchError: payload_too_large (status 422)` — the encoded resume exceeded GitHub's payload size. Switch the firer to `strategy: 'stage'` (see `services/firer-service.js` → `encodeResumeAttachment`) and re-run.
- `GDrive upload failed: 403` — the service account lost access to the target folder. Re-share the folder with the service-account email.
- `GDrive upload failed: 404` — `GDRIVE_FOLDER_PATH` does not resolve. Check the path and ensure `createMissing: true` is set in `uploadFile()` (it is by default).

## 4. Coda row failures

- `Coda API request failed with status 401` — `CODA_API_TOKEN` is missing or revoked. Regenerate in Coda → API tokens.
- `Coda API request failed with status 404` — `CODA_DOC_ID` or `CODA_TABLE_ID` is wrong. Confirm the IDs against the URL of the target Coda table.
- `No row found` / `Multiple rows found` — the `Email` column is not unique. Check the Coda table's column settings; the dedup path in `scripts/coda-row-step.js` requires a unique match.

## 5. Real example walkthrough

> **Symptom:** Slack alert says `Drive Upload / upload` failed.
>
> **Steps:**
> 1. Open the run, click the `upload` job.
> 2. The first failing step is `Upload to Drive and capture link`. Click into it.
> 3. The log line is `GDrive upload failed: 403`.
> 4. Confirm the service-account email is listed under **Share** on the target folder.
> 5. Re-trigger the workflow with `workflow_dispatch` after fixing the share.
> 6. Verify the link in `$GITHUB_OUTPUT` is now valid by clicking the Coda row in the linked doc.

## 6. Replaying a failed run

For a non-flaky failure, the fastest path is usually to re-run the failing job from the Actions UI. The dispatch payload is the same one the listener emitted — no need to re-send the email.

## 7. When to escalate

- **Two or more consecutive runs fail with the same error** after one fix attempt.
- **A `ParserError` is being logged repeatedly** for a class of valid emails — the regex in `services/parser-service.js` likely needs to be relaxed.
- **The Slack alert itself stops arriving** — `notify-failure.yml` may be misconfigured; check its `workflow_run` filter.
