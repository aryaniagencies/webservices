import { Hono } from "hono";
import { communicationmanager } from "./routes/communication/index.js";

const app = new Hono();

// sanitize all incoming requests through /security/index.js/sanitizerequests
app.use('*', async (c, next) => {
  await next();
});

// Communications URLS
// parse the request and sned the headers and body to /communications/index.js/comms
app.post('/contact', async (c) => {
  const result = await communicationmanager.comms(c.req, c.env);
  return c.json({ status: "success", messageId: result.messageId });
});

// User
// app.get('/users', users.handlerequest(options));

// Media Handling Requests

// Settings

app.onError((error, c) => {
  if (error instanceof Response) return error;
  console.error("Request failed", { name: error.name, message: error.message });
  return c.json({ error: "Request failed" }, error.code === "P2025" ? 404 : 500);
});

export default app;