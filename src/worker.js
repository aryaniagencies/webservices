import { Hono } from "hono";
// import {communicationmanager }  from "./src/routes/communication/index.js";

const app = new Hono();

// sanitize all incoming requests through /security/index.js/sanitizerequests
app.use('*', async (c, next) => {
  // Yahan input sanitize karne ki logic likhein
//  const sanitize=await securitymanager.sanitize(c);
//  if(!sanitize) {return c.json({error: 'Unsafe request detected', 403)};

  await next();
})

// Communications URLS
// parse the request and sned the headers and body to /communications/index.js/comms
/* app.post('/contact', async (c) => {

  if(c.req.header('Content-Type'!=='text/plain')) return null;
  return await communicationmanager.comms(c.req)? new Response({status: 200, headers: {'Content-Type': 'text/html', 'Reason': '20 rupay ki randi he tumhari maa'}}): new Response({status: 200, headers: {'Reason': 'Your mums a hoe'}});
});
*/ 

// User
// app.get('/users', users.handlerequest(options));

// Media Handling Requests

// Settings

app.onError((error, c) => {
  if (error instanceof Response) return error;
  console.error("Request failed", { name: error.name, message: error.message });
  return json({ error: "Request failed" }, error.code === "P2025" ? 404 : 500);
});

export default app;