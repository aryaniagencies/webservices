import fs from "node:fs";
import path from "node:path";
import { cloudinaryManager, getCloudItem } from "../cloud/index.js";

// ==========================================
// 1. IMAGE / GENERIC MEDIA MANAGER MODULE
// ==========================================
export const imageManager = {
  
  createMediaMetadata({
    key,
    name,
    url,
    contentType,
    size,
    width,
    height,
    duration,
    resourceType = "image",
    provider,
    metadata = {},
  }) {
    requireValue(key, "Media metadata requires key");

    return {
      key,
      name: name || key,
      url: url || null,
      mimeType: contentType || null,
      contentType: contentType || null,
      size: size ?? null,
      width: width ?? null,
      height: height ?? null,
      duration: duration ?? null,
      resourceType,
      provider,
      metadata,
    };
  },

  async putmedia({
    env = {},
    key,
    body,
    contentType = "application/octet-stream",
    filename,
    resourceType = "auto",
  }) {
    requireValue(key, "Media uploads require key");
    requireValue(body, "Media uploads require body");

    const provider = getProvider(env);
    if (provider !== "cloudinary") {
      throw new Error(`Unsupported media provider: ${provider}`);
    }

    return cloudinaryManager.uploadMedia(
      {
        body,
        filename: filename || key,
        publicId: key,
        resourceType,
        contentType,
      },
      env
    );
  },

  async getmedia(first, second) {
    const { env, link } = normalizeMediaArguments(first, second);
    requireValue(link, "Media link is required");

    var req = await getCloudItem(link, env);

    //check if req got a media item by checking if req.status is 200 and its mime type is an image or video or audio
    if (req.status !== 200) {
      return null;
    }
    
    const contentType = req.response.headers.get("content-type");
    if(contentType && !contentType.startsWith("image/") && !contentType.startsWith("video/") && !contentType.startsWith("audio/")) {
      return null;
    }

    return req.status === 200 ? req.response : null;
  },

  async deleteMedia(link) {

    // send a request to /cloud/index.js to delete the media item with the given key and assume that the key will be provided later
    cloudmanager.deleteMedia(link);
    
  },
};

// ==========================================
// 2. VIDEO MANAGER MODULE
// ==========================================
export const videoManager = {
  VIDEO_EXTENSIONS: new Set([
    ".avi",
    ".m4v",
    ".mkv",
    ".mov",
    ".mp4",
    ".mpeg",
    ".mpg",
    ".ogv",
    ".webm",
  ]),

  VIDEO_MIME_TYPES: {
    ".avi": "video/x-msvideo",
    ".m4v": "video/mp4",
    ".mkv": "video/x-matroska",
    ".mov": "video/quicktime",
    ".mp4": "video/mp4",
    ".mpeg": "video/mpeg",
    ".mpg": "video/mpeg",
    ".ogv": "video/ogg",
    ".webm": "video/webm",
  },

  getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  },

  isVideoFile(filePath) {
    return (
      typeof filePath === "string" &&
      this.VIDEO_EXTENSIONS.has(this.getExtension(filePath))
    );
  },

  getVideoMimeType(filePath) {
    return (
      this.VIDEO_MIME_TYPES[this.getExtension(filePath)] ||
      "application/octet-stream"
    );
  },

  async getVideoMetadata(filePath) {
    if (!this.isVideoFile(filePath))
      throw new TypeError("Unsupported video file type");

    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) throw new Error("Video path is not a file");

    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      mimeType: this.getVideoMimeType(filePath),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  },

  async streamVideo(request, response, filePath) {
    const metadata = await this.getVideoMetadata(filePath);
    const range = request.headers.range;

    response.setHeader("Accept-Ranges", "bytes");
    response.setHeader("Content-Type", metadata.mimeType);

    if (!range) {
      response.setHeader("Content-Length", metadata.size);
      fs.createReadStream(filePath).pipe(response);
      return;
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      response
        .status(416)
        .setHeader("Content-Range", `bytes */${metadata.size}`)
        .end();
      return;
    }

    const start = match[1] === "" ? 0 : Number(match[1]);
    const requestedEnd = match[2] === "" ? metadata.size - 1 : Number(match[2]);
    const end = Math.min(requestedEnd, metadata.size - 1);

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start > end
    ) {
      response
        .status(416)
        .setHeader("Content-Range", `bytes */${metadata.size}`)
        .end();
      return;
    }

    response.status(206);
    response.setHeader("Content-Range", `bytes ${start}-${end}/${metadata.size}`);
    response.setHeader("Content-Length", end - start + 1);
    fs.createReadStream(filePath, { start, end }).pipe(response);
  },
};

// ==========================================
// 3. AUDIO MANAGER MODULE
// ==========================================
export const audioManager = {
  AUDIO_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    "Access-Control-Expose-Headers":
      "Accept-Ranges, Content-Length, Content-Range, Content-Type",
  },

  audioResponseHeaders(extra = {}) {
    return {
      ...this.AUDIO_CORS_HEADERS,
      "Accept-Ranges": "bytes",
      ...extra,
    };
  },

  async serveAudio(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: this.AUDIO_CORS_HEADERS,
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: this.audioResponseHeaders({ Allow: "GET, HEAD, OPTIONS" }),
      });
    }

    const bucket = env?.AUDIO_BUCKET;
    if (!bucket)
      return new Response("AUDIO_BUCKET binding is missing", { status: 500 });

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key || key.includes("..")) {
      return new Response("Audio not found", {
        status: 404,
        headers: this.audioResponseHeaders(),
      });
    }

    const object = await bucket.get(key, {
      range: request.headers.get("Range") || undefined,
    });
    if (!object) {
      return new Response("Audio not found", {
        status: 404,
        headers: this.audioResponseHeaders(),
      });
    }

    const range = object.range;
    const headers = this.audioResponseHeaders({
      "Content-Type": object.httpMetadata?.contentType || "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(object.size != null ? { "Content-Length": String(object.size) } : {}),
      ...(range
        ? {
            "Content-Range": `bytes ${range.offset}-${
              range.offset + range.length - 1
            }/*`,
          }
        : {}),
    });

    return new Response(request.method === "HEAD" ? null : object.body, {
      status: range ? 206 : 200,
      headers,
    });
  },
};

// ==========================================
// BUNDLED MAIN MODULE
// ==========================================
export const mediamanager = {

    normalizeMediaArguments(first, second) {
        if (typeof first === "string") {
            return { link: first, env: second || {} };
        }
        return { env: first || {}, link: second };
    },

    createMediaItem(response, link) {
        if (!(response instanceof Response)) return response;

        const contentType = response.headers.get("content-type");
        const [resourceType, format] = contentType?.split("/") || [];
        const contentLength = response.headers.get("content-length");

        return {
            key: link,
            name: link,
            url: link,
            mimeType: contentType,
            size: contentLength ? Number(contentLength) : null,
            width: null,
            height: null,
            duration: null,
            resourceType: resourceType || "application",
            format: format || null,
            response,
        };
    },

    getmedia(link) {}
};

// Named Exports for Modules
export { imageManager, videoManager, audioManager, mediamanager };