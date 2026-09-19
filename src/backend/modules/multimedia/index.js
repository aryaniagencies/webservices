import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getConfig, requireConfig } from "../../../config/index.js";

let s3;
function getS3() {
  if (!s3) s3 = new S3Client({ region: getConfig().aws.region });
  return s3;
}

export async function createUploadUrl({ key, contentType, expiresIn } = {}) {
  const config = requireConfig("AWS_S3_BUCKET");
  if (!key || !contentType) throw new Error("Media uploads require key and contentType");
  const command = new PutObjectCommand({ Bucket: config.aws.s3Bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(getS3(), command, { expiresIn: expiresIn ?? config.mediaUrlTtlSeconds });
  return { key, url, expiresIn: expiresIn ?? config.mediaUrlTtlSeconds };
}

export async function deleteMedia(key) {
  const config = requireConfig("AWS_S3_BUCKET");
  if (!key) throw new Error("Media deletion requires key");
  return getS3().send(new DeleteObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }));
}

export const multimediaManager = { createUploadUrl, deleteMedia };