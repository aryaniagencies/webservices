import { cloudinaryManager } from "../cloud/index.js";

function getProvider(env = {}) {
  return env.MEDIA_PROVIDER || "cloudinary";
}

function requireValue(value, message) {
  if (!value) throw new Error(message);
  return value;
}

export function createUploadUrl({ key, contentType }, env = {}) {
  requireValue(key, "Media uploads require key");
  requireValue(contentType, "Media uploads require contentType");

  const provider = getProvider(env);
  if (provider !== "cloudinary") {
    throw new Error(
      `${provider} does not support client-side upload URLs through this manager`,
    );
  }

  const cloudName = requireValue(
    env.CLOUDINARY_CLOUD_NAME,
    "CLOUDINARY_CLOUD_NAME is required",
  );
  const uploadPreset = requireValue(
    env.CLOUDINARY_UPLOAD_PRESET,
    "CLOUDINARY_UPLOAD_PRESET is required",
  );

  return {
    key,
    method: "POST",
    url: `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudName,
    )}/auto/upload`,
    fields: { upload_preset: uploadPreset, public_id: key },
    contentType,
  };
}

export function createMediaMetadata({
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
}

export async function putMedia({
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
    env,
  );
}

export function getMedia(link, env = {}) {
  return cloudinaryManager.fetchMedia(link, env);
}

export function deleteMedia(key) {
  requireValue(key, "Media deletion requires key");
  throw new Error(
    "Cloudinary deletion requires a signed server-side destroy operation. It is not implemented by the current cloudinary module.",
  );
}

export const imageManager = {
  createUploadUrl,
  createMediaMetadata,
  putMedia,
  getMedia,
  deleteMedia,
};
