# Webservices API

Reusable, serverless-friendly JavaScript managers for Cloudflare Workers. The
package uses native ES modules, Prisma Accelerate for TiDB, Cloudflare R2 for
media, and HTTP APIs for email and notifications.

## Requirements

- Node.js 20+ for local development and Wrangler
- A Prisma Accelerate connection URL backed by TiDB
- A Cloudflare account with Workers and R2 enabled

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Set `DATABASE_URL` to a Prisma Accelerate URL. Prisma Accelerate is required
because Workers cannot open a normal TCP connection to TiDB. Run migrations from
a Node.js environment with `npx prisma db push` or `npx prisma migrate deploy`.

## Importing the managers

Managers can be imported by another JavaScript project. Pass the Worker `env`
object to methods that access a service binding or secret:

```js
import {
	communicationManager,
	journalManager,
	multimediaManager,
} from "@your-scope/webservices";

await communicationManager.sendEmail({
	to: "reader@example.com",
	subject: "Welcome",
	html: "<p>Thanks for joining.</p>",
}, env);

const page = await journalManager.listPosts({ page: 1, pageSize: 10, publishedOnly: true }, env);
const post = await journalManager.createPost({
	title: "A first post",
	slug: "a-first-post",
	content: "# Hello\n\nThis is **rich text**.",
	authorId: "author-id",
}, env);
await journalManager.updatePost(post.id, { title: "An updated post" }, env);
await journalManager.deletePost(post.id, env);

const upload = await multimediaManager.createUploadUrl({
	key: "posts/cover.jpg",
	contentType: "image/jpeg",
}, env);
console.log(upload.url, page.items);
```

`journalManager` stores Markdown content and exposes `renderRichText` for safe,
sanitized HTML rendering. `createUploadUrl` returns the Worker upload URL for
an R2 object. The deployed API also supports `PUT`, `GET`, and `DELETE` at
`/media/{key}`.

## Cloudflare Workers deployment

This is a Cloudflare module Worker, not an AWS Lambda function. Cloudflare runs
the application on V8 isolates using the standard `fetch(request, env)` API.
Node.js is used for local tooling and package installation; the deployed code
uses Worker-compatible APIs and Prisma's edge client.

Create the R2 bucket named in `wrangler.toml`, then configure secrets:

```bash
npx wrangler r2 bucket create webservices-media
npx wrangler secret put DATABASE_URL
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npm run deploy
```

`DATABASE_URL` should be a Prisma Accelerate URL, not a raw TiDB `mysql://` URL.
For local development, put non-secret values in `.env` and use `wrangler dev`.

The API routes are `GET /posts`, `GET /posts/{id-or-slug}`, `POST /posts`,
`PATCH /posts/{id}`, `DELETE /posts/{id}`, and media `PUT`, `GET`, and `DELETE`
at `/media/{key}`.

## Worker handler usage

```js
import { journalManager } from "@your-scope/webservices";

export default {
	async fetch(request, env) {
		return new Response(JSON.stringify(
			await journalManager.listPosts({ page: 1, pageSize: 20 }, env),
		), { headers: { "content-type": "application/json" } });
	},
};
```

## Scripts

```bash
npm run build       # validates the Worker bundle with Wrangler
npm run dev         # starts Wrangler local development
npm run deploy      # generates Prisma and deploys to Cloudflare
npm test            # runs the lightweight manager import tests
npm run prisma:generate
```

Service clients are initialized lazily on first use. No API keys are logged or
read at module import time. Email uses Resend's HTTP API, notifications use
`NOTIFICATION_WEBHOOK_URL`, and media uses the `MEDIA_BUCKET` R2 binding.