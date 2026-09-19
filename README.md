# Webservices API

Reusable, serverless-friendly JavaScript managers for AWS Lambda and other Node.js runtimes.
The package uses native ES modules, esbuild, Prisma, TiDB, Amazon SES, and Amazon S3.

## Requirements

- Node.js 20+
- A TiDB connection string
- AWS credentials with SES and/or S3 permissions when those managers are used

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npm run build
```

Set `DATABASE_URL` to your TiDB connection string. Run `npx prisma db push` for a
new database, or use `npx prisma migrate dev` during local development.

## Importing the managers

The built package can be imported from another plain JavaScript project:

```js
import {
	communicationManager,
	databaseManager,
	journalManager,
	multimediaManager,
} from "@your-scope/webservices";

await communicationManager.sendEmail({
	to: "reader@example.com",
	subject: "Welcome",
	html: "<p>Thanks for joining.</p>",
});

const page = await journalManager.listPosts({ page: 1, pageSize: 10, publishedOnly: true });
const post = await journalManager.createPost({
	title: "A first post",
	slug: "a-first-post",
	content: "# Hello\n\nThis is **rich text**.",
	authorId: "author-id",
});
await journalManager.updatePost(post.id, { title: "An updated post" });
await journalManager.deletePost(post.id);

const upload = await multimediaManager.createUploadUrl({
	key: "posts/cover.jpg",
	contentType: "image/jpeg",
});
console.log(upload.url, page.items);
```

`journalManager` stores Markdown content and exposes `renderRichText` for safe,
sanitized HTML rendering. `createUploadUrl` returns a presigned S3 URL so large
media files do not pass through a Lambda function.

## AWS Lambda deployment

This is Node.js code for AWS Lambda, not a browser-only worker runtime. AWS
supports Node.js 20.x and 22.x Lambda runtimes. The repository includes an API
Gateway HTTP handler and an AWS SAM template.

Build the Lambda artifact with:

```bash
npm run sam:build
sam deploy --guided
```

The template expects `DatabaseUrl`, `MediaBucket`, and `SesFromEmail` parameters.
Store the TiDB URL in AWS Secrets Manager for production and inject it into the
function environment through your deployment pipeline rather than committing it.

The API routes are `GET /posts`, `GET /posts/{id-or-slug}`, `POST /posts`,
`PATCH /posts/{id}`, and `DELETE /posts/{id}`.

For a manually created Lambda, use `dist/handlers/http.handler` as the handler
and deploy `dist`, `node_modules`, and `package.json` together. Run
`npm run prisma:generate` during the build so Prisma's Lambda query engine is
included.

## Lambda handler usage

```js
import { journalManager } from "@your-scope/webservices";

export const handler = async () => ({
	statusCode: 200,
	headers: { "content-type": "application/json" },
	body: JSON.stringify(await journalManager.listPosts({ page: 1, pageSize: 20 })),
});
```

## Scripts

```bash
npm run build       # bundles src/index.js to dist/index.js
npm test            # runs the lightweight manager import tests
npm run prisma:generate
```

Service clients are initialized lazily on first use. No API keys are logged or
read at module import time. For notifications, set `NOTIFICATION_WEBHOOK_URL`;
for email, set the SES variables in `.env.example`.