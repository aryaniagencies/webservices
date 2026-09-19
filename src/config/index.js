const readEnv = (name, fallback = undefined) => process.env[name] ?? fallback;

let cachedConfig;

export function getConfig() {
  if (cachedConfig) return cachedConfig;

  cachedConfig = Object.freeze({
    nodeEnv: readEnv("NODE_ENV", "development"),
    databaseUrl: readEnv("DATABASE_URL"),
    aws: {
      region: readEnv("AWS_REGION", "us-east-1"),
      s3Bucket: readEnv("AWS_S3_BUCKET"),
      sesFromEmail: readEnv("AWS_SES_FROM_EMAIL"),
      sesConfigurationSet: readEnv("AWS_SES_CONFIGURATION_SET"),
    },
    notificationWebhookUrl: readEnv("NOTIFICATION_WEBHOOK_URL"),
    mediaUrlTtlSeconds: Number(readEnv("MEDIA_URL_TTL_SECONDS", "900")),
  });

  return cachedConfig;
}

export function requireConfig(...names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  return getConfig();
}