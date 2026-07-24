/**
 * notification-service.js
 *
 * Outbound alerting for the pipeline. Used by Epic 7 (run-failure
 * observability) and Epic 8 KR 8.1 (failure notification on workflow
 * error). Supports Slack incoming webhooks and a generic email-webhook
 * fallback.
 */

require('dotenv').config();

/**
 * Brief Summary: Send a message to a Slack incoming webhook.
 *
 * Parameters (Arguments):
 * - payload (object | string, required): Either a plain string (sent as
 *   { text }) or a fully-formed Slack blocks payload.
 * - options (Object, optional):
 *   - webhookUrl (string, optional): Override; falls back to SLACK_WEBHOOK_URL.
 *   - fetchImpl (function, optional): (input, init) => Promise<Response>.
 *
 * Returns: Promise<void>
 *
 * Raises / Errors: Throws Error when no webhook URL is configured or the
 * webhook responds non-2xx.
 *
 * Examples:
 * await sendSlackMessage(':rotating_light: Workflow failed');
 */
async function sendSlackMessage(payload, options = {}) {
  // TODO(KR 8.1): build the body (string => { text: payload }), resolve
  // the webhook URL, POST with Content-Type: application/json. Surface
  // non-2xx responses as a thrown Error with the status code.
}

/**
 * Brief Summary: Send a failure notification using the configured channel
 * (Slack now; email-webhook later if we add one).
 *
 * Parameters (Arguments):
 * - failure (object, required):
 *   - stage (string, required): Pipeline stage that failed
 *     (e.g. 'drive-upload', 'coda-row').
 *   - message (string, required): Human-readable failure description.
 *   - runId (string, optional): GitHub Actions run URL or id.
 *   - context (object, optional): Arbitrary extra fields to include.
 * - options (Object, optional): Forwarded to sendSlackMessage.
 *
 * Returns: Promise<void>
 *
 * Raises / Errors: Propagates sendSlackMessage errors. Callers may
 * intentionally swallow them — a failed alert must not double-fail the
 * workflow.
 *
 * Examples:
 * await sendFailureNotification({ stage: 'coda-row', message: 'row create failed', runId });
 */
async function sendFailureNotification(failure, options = {}) {
  // TODO(KR 8.1): format a Slack-friendly summary (emoji + stage +
  // message + run link when present) and forward to sendSlackMessage.
  // Keep the formatting here so other channels (email, PagerDuty) can
  // share the same input shape.
}

/**
 * Public API exposed by this module.
 */
module.exports = {
  sendFailureNotification,
  sendSlackMessage,
};

if (require.main === module) {
  console.log('Notification service loaded. Import sendFailureNotification from this module.');
}
