function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  isProduction: process.env.NODE_ENV === "production",
  // Directory containing the built web client. Served by the API in production
  // so the client and API share an origin (and therefore the session cookie).
  staticDir: process.env.STATIC_DIR,
};
