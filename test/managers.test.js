import test from "node:test";
import assert from "node:assert/strict";
import { communicationManager, journalManager, multimediaManager } from "../src/index.js";

test("exports all managers without initializing service clients", () => {
  assert.equal(typeof communicationManager.sendEmail, "function");
  assert.equal(typeof multimediaManager.createUploadUrl, "function");
  assert.equal(typeof journalManager.listPosts, "function");
});

test("renders sanitized rich text", () => {
  const html = journalManager.renderRichText("# Hello\n\n**world**\n\n<script>alert(1)</script>");
  assert.match(html, /<h1>Hello<\/h1>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /<strong>world<\/strong>/);
});