import {
  readJsonRequest,
  validateRequest,
  securityHeaders,
} from "./security/index.js";
import {
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
} from "./lowlevel/modules/journal/index.js";
import {
  putMedia,
  getMedia,
  deleteMedia,
} from "./lowlevel/modules/multimedia/images.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: securityHeaders(),
});

const postIdFromPath = (path) => path.match(/^\/posts\/([^/]+)$/)?.[1];
const mediaKeyFromPath = (path) => path.match(/^\/media\/(.+)$/)?.[1];

function parseRequest(request) {
  const url = new URL(request.url);

  return {
    method: request.method,
    pathname: url.pathname,
    url,
    postId: postIdFromPath(url.pathname),
    mediaKey: mediaKeyFromPath(url.pathname),
  };
}

export default {
  async fetch(request, env) {
    const { method, pathname, url, postId, mediaKey } = parseRequest(request);

    try {
      if (pathname === "/posts" && method === "GET") {
        return json(await listPosts({
          page: url.searchParams.get("page") ?? 1,
          pageSize: url.searchParams.get("pageSize") ?? 20,
          publishedOnly: url.searchParams.get("publishedOnly") === "true",
        }, env));
      }
      if (postId && method === "GET") {
        return json(await getPost(decodeURIComponent(postId), env));
      }
      if (pathname === "/posts" && method === "POST") {
        const payload = await readJsonRequest(request, {
          methods: ["POST"],
          htmlFields: ["content", "html", "body"],
          maxBodyBytes: 512 * 1024,
        });

        return json(await createPost(payload, env), 201);
      }
      if (postId && method === "PATCH") {
        const payload = await readJsonRequest(request, {
          methods: ["PATCH"],
          htmlFields: ["content", "html", "body"],
          maxBodyBytes: 512 * 1024,
        });

        return json(await updatePost(decodeURIComponent(postId), payload, env));
      }
      if (postId && method === "DELETE") {
        return json(await deletePost(decodeURIComponent(postId), env));
      }

      if (mediaKey && method === "PUT") {
        validateRequest(request, {
          methods: ["PUT"],
          requireJson: false,
          maxBodyBytes: 10 * 1024 * 1024,
        });

        return json(await putMedia({
          env,
          key: decodeURIComponent(mediaKey),
          body: request.body,
          contentType: request.headers.get("content-type"),
        }));
      }
      if (mediaKey && method === "GET") {
        const response = await getMedia(decodeURIComponent(mediaKey), env);
        if (!response) return new Response("Not found", { status: 404 });
        return response instanceof Response
          ? response
          : new Response(response.body, { headers: response.httpMetadata });
      }
      if (mediaKey && method === "DELETE") {
        return json(await deleteMedia(decodeURIComponent(mediaKey), env));
      }

      return json({ error: "Route not found" }, 404);
    } catch (error) {
      if (error instanceof Response) return error;
      console.error("Request failed", { name: error.name, message: error.message });
      return json({ error: "Request failed" }, error.code === "P2025" ? 404 : 500);
    }
  },
};