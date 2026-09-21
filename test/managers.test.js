import test from "node:test";
import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
import { communicationManager, dbmanager, cloudmanager, multimediaManager } from "../src/index.js";

test("exports all managers without initializing service clients", () => {
  assert.equal(typeof communicationManager.sendEmail, "function");
  assert.equal(typeof multimediaManager.createUploadUrl, "function");
  assert.equal(typeof journalManager.listPosts, "function");
  assert.equal(typeof multimediaManager.putMedia, "function");
});

test("renders sanitized rich text", () => {
  const html = journalManager.renderRichText("# Hello\n\n**world**\n\n<script>alert(1)</script>");
  assert.match(html, /<h1>Hello<\/h1>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<strong>world<\/strong>/);
});

// A tester function that runs all manager functions and reports failures.
async function periodictests() {
  const reportFile = new URL("./periodic-test-errors.txt", import.meta.url);
  const managers = { communicationManager, multimediaManager, dbmanager, cloudmanager };
  const failures = [];

  for (const [managerName, manager] of Object.entries(managers)) {
    for (const [functionName, fn] of Object.entries(manager)) {
      if (typeof fn !== "function" || functionName === "sendEmail") continue;

      try {
        await fn.call(manager);
      } catch (error) {
        failures.push(
          `[${new Date().toISOString()}] ${managerName}.${functionName}: ${error.stack ?? error}`,
        );
      }
    }
  }

  if (failures.length === 0) return;

  const report = `${failures.join("\n")}\n`;
  await appendFile(reportFile, report, "utf8");

  try {
    await communicationManager.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "Periodic manager test failures",
      text: report,
      attachments: [{
        filename: "periodic-test-errors.txt",
        path: reportFile.pathname,
      }],
    });
  } catch (error) {
    await appendFile(
      reportFile,
      `[${new Date().toISOString()}] Failed to email report: ${error.stack ?? error}\n`,
      "utf8",
    );
  }
}

export { periodictests };