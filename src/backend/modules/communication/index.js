import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { getConfig, requireConfig } from "../../../config/index.js";

let ses;

function getSes() {
  if (!ses) ses = new SESv2Client({ region: getConfig().aws.region });
  return ses;
}

export async function sendEmail({ to, subject, html, text }) {
  const config = requireConfig("AWS_SES_FROM_EMAIL");
  if (!to || !subject || (!html && !text)) throw new Error("Email requires to, subject, and html or text");
  const command = new SendEmailCommand({
    FromEmailAddress: config.aws.sesFromEmail,
    Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
    Content: { Simple: { Subject: { Data: subject }, Body: { Html: html ? { Data: html } : undefined, Text: text ? { Data: text } : undefined } } },
    ConfigurationSetName: config.aws.sesConfigurationSet || undefined,
  });
  return getSes().send(command);
}

export async function sendNotification(payload) {
  const { notificationWebhookUrl } = requireConfig("NOTIFICATION_WEBHOOK_URL");
  const response = await fetch(notificationWebhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Notification webhook failed with HTTP ${response.status}`);
  return { status: response.status };
}

export const communicationManager = { sendEmail, sendNotification };