import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from "../modules/journal/index.js";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const parseBody = (event) => {
  if (!event.body) return {};
  const value = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return JSON.parse(value);
};

export async function handler(event) {
  try {
    const method = event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
    const path = event.rawPath ?? event.path ?? "/posts";
    const postId = path.match(/^\/posts\/([^/]+)$/)?.[1];

    if (method === "GET" && postId) return json(200, await getPost(postId));
    if (method === "GET" && path === "/posts") {
      const query = event.queryStringParameters ?? {};
      return json(200, await listPosts(query));
    }
    if (method === "POST" && path === "/posts") return json(201, await createPost(parseBody(event)));
    if (method === "PATCH" && postId) return json(200, await updatePost(postId, parseBody(event)));
    if (method === "DELETE" && postId) return json(200, await deletePost(postId));

    return json(404, { error: "Route not found" });
  } catch (error) {
    console.error("Request failed", { name: error.name, message: error.message });
    return json(error.code === "P2025" ? 404 : 500, { error: "Request failed" });
  }
}