const defaultEnv = globalThis.process?.env ?? {};

export function getConfig(env = defaultEnv) {
  return Object.freeze({
    nodeEnv: env.NODE_ENV ?? "development",
    databaseUrl: env.DATABASE_URL,
    resendApiKey: env.RESEND_API_KEY,
    emailFrom: env.EMAIL_FROM,
    notificationWebhookUrl: env.NOTIFICATION_WEBHOOK_URL,
    publicApiUrl: env.PUBLIC_API_URL,
  });
}

export function requireConfig(env, ...names) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  return getConfig(env);
}