// ══════════════════════════════════════════
// QPC HR Automation — Google Apps Script
// ══════════════════════════════════════════

const CODA_API_TOKEN = PropertiesService.getScriptProperties().getProperty("CODA_API_TOKEN");
const CODA_DOC_ID = "b6UvgZm6mK";
const INTERVIEW_TRACKER_TABLE = "grid-noePI2YD13";
const SPREADSHEET_ID = "1oMoHqFqbMEm_iKCfQVeHPR02gkLwr3j36fyhN65qiJE";
const SLACK_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty("SLACK_WEBHOOK_URL");

function getCandidates() {
  const url = `https://coda.io/apis/v1/docs/${CODA_DOC_ID}/tables/${INTERVIEW_TRACKER_TABLE}/rows?useColumnNames=true`;
  const options = {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${CODA_API_TOKEN}`,
      "Content-Type": "application/json"
    }
  };
  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());
  return data.items;
}

function sendSlackNotification(candidateName, position, status) {
  const statusEmoji = {
    "Offerred Letter": "🎉",
    "Not Continuing": "❌",
    "Not Qualified": "❌",
    "Offered & Rejected": "🚫",
    "Interviewing": "📅",
    "Accepted and Onboarded": "✅"
  }[status] || "📋";

  const message = {
    text: `${statusEmoji} *HR Update*`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${statusEmoji} Candidate Status Update`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Candidate:*\n${candidateName}`
          },
          {
            type: "mrkdwn",
            text: `*Role:*\n${position}`
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n${status}`
          },
          {
            type: "mrkdwn",
            text: `*Time:*\n${new Date().toLocaleString()}`
          }
        ]
      }
    ]
  };

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(message)
  };

  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);
  Logger.log(`Slack notification sent for ${candidateName} — ${status}`);
}

function sendOfferEmail(name, email, position, startDate) {
  const subject = `Offer Letter — ${position} at Quantum Pulse Consulting`;
  const body = `Hi ${name},

We are thrilled to offer you the ${position} position at Quantum Pulse Consulting!

Start Date: ${startDate || "TBD"}

Please complete your application form here:
https://coda.io/form/New-Intern-Form_d_Y8WXOeTDO

We look forward to having you on the team!

Best regards,
Quantum Pulse Consulting HR Team`;

  GmailApp.sendEmail(email, subject, body);
  Logger.log(`Offer email sent to ${name} (${email})`);
}

function sendRejectionEmail(name, email, position) {
  const subject = `Your Application at Quantum Pulse Consulting`;
  const body = `Hi ${name},

Thank you for taking the time to interview with us! We enjoyed learning more about you.

At this moment, we are unable to offer you the ${position} position. However, we encourage you to stay in touch and apply for other positions in the future.

Best regards,
Quantum Pulse Consulting HR Team`;

  GmailApp.sendEmail(email, subject, body);
  Logger.log(`Rejection email sent to ${name} (${email})`);
}

function sendInterviewEmail(name, email, position, interviewDate) {
  const subject = `Interview Confirmation — ${position} at Quantum Pulse Consulting`;
  const body = `Hi ${name},

Your interview for the ${position} position at Quantum Pulse Consulting has been confirmed!

Interview Date: ${interviewDate || "TBD"}

Please make sure to be available and check your calendar for the meeting link.

Best regards,
Quantum Pulse Consulting HR Team`;

  GmailApp.sendEmail(email, subject, body);
  Logger.log(`Interview confirmation sent to ${name} (${email})`);
}

function sendOnboardingEmail(name, email, position, startDate) {
  const subject = `Welcome to Quantum Pulse Consulting!`;
  const body = `Hi ${name},

Welcome to Quantum Pulse Consulting! We are so excited to have you join us as ${position}.

Start Date: ${startDate || "TBD"}

Here are your next steps:
1. Complete your onboarding form: https://coda.io/form/New-Intern-Form_d_Y8WXOeTDO
2. Read the initial onboarding materials on Coda
3. You will receive your QPC email shortly

Welcome aboard!
Quantum Pulse Consulting HR Team`;

  GmailApp.sendEmail(email, subject, body);
  Logger.log(`Onboarding email sent to ${name} (${email})`);
}

function getOrCreateSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return ss.getSheets()[0];
  } catch(e) {
    const ss = SpreadsheetApp.create("QPC HR Email Log");
    const sheet = ss.getSheets()[0];
    sheet.appendRow(["Timestamp", "Name", "Email", "Status", "Action"]);
    return sheet;
  }
}

function checkAndSendEmails() {
  const sheet = getOrCreateSheet();
  const candidates = getCandidates();

  candidates.forEach(candidate => {
    const values = candidate.values;
    const name = values["Name"] || "";
    const email = values["Email"] || "";
    const status = values["Status"] || "";
    const position = values["Position"] || "Intern";
    const startDate = values["Starting date"] || "";
    const interviewDate = values["Date and Time of Interview"] || "";

    if (!email) return;

    const timestamp = new Date();

    if (status === "Offerred Letter") {
      sendOfferEmail(name, email, position, startDate);
      sendSlackNotification(name, position, status);
      sheet.appendRow([timestamp, name, email, status, "Offer email sent + Slack notified"]);
    }
    else if (status === "Not Continuing" || status === "Not Qualified" || status === "Offered & Rejected") {
      sendRejectionEmail(name, email, position);
      sendSlackNotification(name, position, status);
      sheet.appendRow([timestamp, name, email, status, "Rejection email sent + Slack notified"]);
    }
    else if (status === "Interviewing") {
      sendInterviewEmail(name, email, position, interviewDate);
      sendSlackNotification(name, position, status);
      sheet.appendRow([timestamp, name, email, status, "Interview confirmation sent + Slack notified"]);
    }
    else if (status === "Accepted and Onboarded") {
      sendOnboardingEmail(name, email, position, startDate);
      sendSlackNotification(name, position, status);
      sheet.appendRow([timestamp, name, email, status, "Onboarding email sent + Slack notified"]);
    }
  });

  Logger.log("Email + Slack check complete.");
}