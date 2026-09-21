//import { getConfig, requireConfig } from "../../../config/index.js";
//import { addToDatabase, dbhandler } from "../dbhandler/index.js";
//import { cloudmanager } from "../cloud/index.js";

import { env } from "hono/adapter";

// email includes


class EmailMessageCompat {
  constructor(from, to, raw) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}

// Cloudflare Workers provides EmailMessage; use a compatible fallback locally.
const EmailMessage = globalThis.EmailMessage || EmailMessageCompat;

const assertSafeHeader = (value, name) => {
  if (typeof value !== "string" || /[\r\n]/.test(value)) {
    throw new Error(`Invalid email ${name}`);
  }

  return value.trim();
};

const encodeBase64 = (value) => {
  const bytes = value instanceof Uint8Array
    ? value
    : new TextEncoder().encode(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
};

export const emailmanager = {

  assertSafeHeader(value, name) {
    if (typeof value !== "string" || /[\r\n]/.test(value)) {
      throw new Error(`Invalid email ${name}`);
    }

    return value.trim();
  },

  encodeBase64(value) {
    const bytes = value instanceof Uint8Array
      ? value
      : new TextEncoder().encode(value);
    let binary = "";

    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }

    return btoa(binary);
  },

  createMimeMessage({ from, to, subject, html, text="", attachment = null }) {
    const boundary = `=_WorkerBoundary_${crypto.randomUUID()}`;

    const parts = [];

    if (text) {
      parts.push(
        `--${boundary}\r\n` +
          `Content-Type: text/plain; charset=UTF-8\r\n` +
          "Content-Transfer-Encoding: base64\r\n\r\n" +
          encodeBase64(text),
      );
    }

    if (html) {
      parts.push(
        `--${boundary}\r\n` +
          `Content-Type: text/html; charset=UTF-8\r\n` +
          "Content-Transfer-Encoding: base64\r\n\r\n" +
          encodeBase64(html),
      );
    }

    if (attachment) {
      const filename = assertSafeHeader(
        attachment.name || attachment.filename || "attachment",
        "attachment filename",
      );
      const contentType = assertSafeHeader(
        attachment.type || attachment.contentType || "application/octet-stream",
        "attachment content type",
      );
      const content = attachment.data || attachment.content;

      if (content == null) {
        throw new Error("Attachment content is required");
      }

      const bytes = content instanceof Uint8Array
        ? content
        : content instanceof ArrayBuffer
          ? new Uint8Array(content)
          : new TextEncoder().encode(String(content));

      parts.push(
        `--${boundary}\r\n` +
          `Content-Type: ${contentType}; name="${filename}"\r\n` +
          `Content-Disposition: attachment; filename="${filename}"\r\n` +
          "Content-Transfer-Encoding: base64\r\n\r\n" +
          encodeBase64(bytes),
      );
    }

    parts.push(`--${boundary}--`);

    return [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      parts.join("\r\n"),
    ].join("\r\n");
  },

  async sendEmail({ from, to, subject, html, text="", attachment = null }) {
    if (!to || !subject || (!html && !text)) {
      throw new Error(
        "Email requires to, subject, and html or text content",
      );
    }

    const sender = assertSafeHeader(
      env?.EMAIL_FROM || env?.SMTP_FROM || required(env, "EMAIL_FROM"),
      "sender",
    );

    const recipients = (Array.isArray(to) ? to : [to]).map((address) =>
      assertSafeHeader(address, "recipient"),
    );

    const cleanSubject = assertSafeHeader(subject, "subject");
    const emailBinding = env?.SEND_EMAIL;

    if (!emailBinding || typeof emailBinding.send !== "function") {
      throw new Error(
        "SEND_EMAIL binding is not configured in the Cloudflare Worker",
      );
    }

    await Promise.all(
      recipients.map(async (recipient) => {
        const rawMessage = createMimeMessage({
          from: env.WEB_EMAIL,
          to: recipient,
          subject: cleanSubject,
          html,
          text,
          attachment: attachment || null,
        });

        const message = new EmailMessage(sender, recipient, rawMessage);
        await emailBinding.send(message);
      }),
    );

    return {
      accepted: recipients,
    };
  },

}

export const communicationmanager = {

  handlerequest(params) {

    handlerequest: async (c) => {
    // Incoming Request Object (Native Web Request)
    const rawRequest = c.req.raw 
    
    // Body, headers, URL direct read kar sakte ho
    const url = c.req.url
    const method = c.req.method

    // switch

    // Response return kar do
    return c.json({
      status: "success",
      message: "Request directly processed by Communication Manager!",
      path: url
    })
  }
  },
  
  async comms(req) {

    const attachment='';
    const timestamp = new Date().toISOString();
    
    // Upload to cloudinary if attachment exists
    // const attachurl = body['attachment'] ? await cloudmanager.uploaditem(attachment, "cloudinary", { folder: "attachments" }) : null;
    /* if (attachment && attachment instanceof File) {

      // Agar file ka binary buffer/content chahiye:
      const arrayBuffer = await attachment.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Yahan se buffer ko S3, Cloudinary par upload kar sakte ho
      cloudmanager.upadloaditem(attachment, "cloudinary")
    }
    // add to database
    /* await addToDatabase(
      {
        req.header('name'),
        req.header('email'),
        req.header('phone'),
        req.header('regarding'),
        req.body,
        attachment: attachurl || null,
      }
    );

    */
    const adminHtml = `
      <div style="text-align: center;">
        <h1 style="color: pink;">New Message Received from: ${req.header('name')}</h1>
        <small> Received at: ${timestamp}</small><br/><br/>
        <p>${req.text()}</p><br/>
        <p>Email: ${req.header('email')}</p>
        <p>Phone: ${req.header('phone')}</p><br/>
      </div>
    `;
    // <p>Attachment: ${attachurl ? `<a href="${google.com}">View Attachment</a>` : "No attachment"}</p>
    
    return env.EMAIL.send(
      {
        from: env.WEB_EMAIL,
        to: env.WEB_EMAIL,
        subject: `New Message Received from ${req.header('name')} regarding: ${req.header('subject')}`,
        html: adminHtml
      }
    );
  },

  async subscribe(email) {

    // add a database entry to the subscribers list database
    dbhandler.addDatabaseEntry(any , {email});
  }

}

export const SocialMediaManager = {
  
  async SchedulePost(content, time, platforms) {

    // Schedule a post to be published on social media platforms at a specified time

  }, 

  async AutomatedMessages(platform, user, message, time) {

    // Send automated messages to users on social media platforms at a specified time

    // if user is "all", send to all users in inbox
  },

}

export async function sendNotification(payload, env = {}) {

  // return null for now
  return null;

  const notificationWebhookUrl =
    env.NOTIFICATION_WEBHOOK_URL ||
    env.notificationWebhookUrl;

  if (!notificationWebhookUrl) {
    throw new Error("NOTIFICATION_WEBHOOK_URL is required");
  }

  const response = await fetch(notificationWebhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Notification webhook failed with HTTP ${response.status}`,
    );
  }

  return {
    status: response.status,
  };
}

export const media = {SocialMediaManager, communicationmanager, emailmanager};
