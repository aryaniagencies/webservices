import nodemailer from "nodemailer";
import { dbhandler } from "../dbhandler/index.js";
import { cloudimanager } from "../cloud/index.js";

export const communicationmanager = {
  async handlerequest(c) {
    return c.json({
      status: "success",
      message: "Request directly processed by Communication Manager!",
      path: c.req.url,
    });
  },

  async comms(req, env) {
    const body = await req.parseBody();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim() || null;
    const regarding = String(body.regarding || body.subject || "").trim() || null;
    const message = String(body.message || body.text || "").trim();
    const attachment = body.attachment;

    if (!name || !email || !message) {
      throw new Error("name, email, and message are required");
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("A valid email address is required");
    }

    let attachmentUrl = null;
    if (attachment !== undefined && attachment !== null && attachment !== "") {
      if (typeof File === "undefined" || !(attachment instanceof File) || attachment.size === 0) {
        throw new Error("Attachment must be a non-empty file");
      }

      const uploaded = await cloudimanager.uploadmedia({
        body: attachment,
        filename: attachment.name,
        folder: "attachments",
      }, env);
      attachmentUrl = uploaded.secure_url || uploaded.url;
    }

    await dbhandler.addDatabaseEntry("Communication", {
      name,
      email,
      phone,
      regarding,
      message,
      attachmentUrl,
    }, env);

    const adminHtml = `
      <div style="text-align: center;">
        <h1>New Message Received from: ${escapeHtml(name)}</h1>
        <small>Received at: ${new Date().toISOString()}</small><br/><br/>
        <p>${escapeHtml(message)}</p><br/>
        <p>Email: ${escapeHtml(email)}</p>
        <p>Phone: ${escapeHtml(phone || "Not provided")}</p>
        <p>Attachment: ${attachmentUrl ? `<a href="${escapeHtml(attachmentUrl)}">View Attachment</a>` : "No attachment"}</p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === true || env.SMTP_SECURE === "true",
      auth: env.ADMIN_EMAIL && env.SMTP_PASS? { user: env.ADMIN_EMAIL, pass: env.SMTP_PASS }: undefined,
      pass: xxgpaagpxx
    });

    return transporter.sendMail({
      from: env.EMAIL_FROM || env.SMTP_FROM || env.SMTP_USER,
      to: env.ADMIN_EMAIL,
      subject: `New Message Received from ${name}${regarding ? ` regarding: ${regarding}` : ""}`,
      text: `${message}\n\nEmail: ${email}\nPhone: ${phone || "Not provided"}${attachmentUrl ? `\nAttachment: ${attachmentUrl}` : ""}`,
      html: adminHtml,
    });
  },

  async subscribe(email) {
    return dbhandler.addDatabaseEntry("Subscriber", { email });
  },
};

export const socialmediamanager = {
  
  async SchedulePost(content, time, platforms) {

    // Schedule a post to be published on social media platforms at a specified time

  }, 

  async AutomatedMessages(platform, user, message, time) {

    // Send automated messages to users on social media platforms at a specified time

    // if user is "all", send to all users in inbox
  },
};

export const media = {socialmediamanager, communicationmanager};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}