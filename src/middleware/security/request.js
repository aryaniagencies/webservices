const DEFAULT_MAX_BODY_BYTES = 1_048_576;

const dangerousHtmlPattern =
  /<\/?(?:script|style|iframe|object|embed|form|base|meta|link)[^>]*>/gi;

const dangerousAttributePattern =
  /\s(?:on[a-z]+|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

const dangerousUrlPattern =
  /(?:javascript|vbscript|data):/gi;

export function sanitizeHtml(value) {
  if (typeof value !== "string") return value;

  return value
    .replace(dangerousHtmlPattern, "")
    .replace(dangerousAttributePattern, "")
    .replace(dangerousUrlPattern, "")
    .trim();
}

export function sanitizeText(value, maxLength = 10_000) {
  if (typeof value !== "string") return value;

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizePayload(value, options = {}) {
  const {
    htmlFields = ["html", "content", "body"],
    maxStringLength = 10_000,
  } = options;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item, options));
  }

  if (!value || typeof value !== "object") {
    return typeof value === "string"
      ? sanitizeText(value, maxStringLength)
      : value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (typeof item !== "string") {
        return [key, sanitizePayload(item, options)];
      }

      return [
        key,
        htmlFields.includes(key)
          ? sanitizeHtml(item)
          : sanitizeText(item, maxStringLength),
      ];
    }),
  );
}

export function validateRequest(
  request,
  {
    methods = ["POST", "PUT", "PATCH"],
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
    requireJson = true,
  } = {},
) {
  if (!methods.includes(request.method)) {
    throw new Response("Method not allowed", {
      status: 405,
      headers: { Allow: methods.join(", ") },
    });
  }

  if (requireJson) {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().startsWith("application/json")) {
      throw new Response("Content-Type must be application/json", {
        status: 415,
      });
    }
  }

  const contentLength = Number(request.headers.get("content-length") || 0);

  if (contentLength > maxBodyBytes) {
    throw new Response("Request body is too large", { status: 413 });
  }
}

export async function readJsonRequest(request, options = {}) {
  validateRequest(request, options);

  const body = await request.text();
  const maxBodyBytes = options.maxBodyBytes || DEFAULT_MAX_BODY_BYTES;

  if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
    throw new Response("Request body is too large", { status: 413 });
  }

  if (!body.trim()) {
    throw new Response("Request body is required", { status: 400 });
  }

  let parsed;

  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Response("Invalid JSON body", { status: 400 });
  }

  return sanitizePayload(parsed, options);
}

export function securityHeaders(headers = {}) {
  return {
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "default-src 'none'",
    ...headers,
  };
}

export function handlerequest(input) {

  

}