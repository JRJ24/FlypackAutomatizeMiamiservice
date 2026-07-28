import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "development" | "test" | "production";

const normalizeNodeEnv = (value?: string): NodeEnv => {
  const normalized = (value || "development").toLowerCase();

  if (normalized === "prod" || normalized === "production") return "production";
  if (normalized === "test") return "test";
  return "development";
};

const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);
const isProduction = nodeEnv === "production";

const getRequiredEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const frontendUrl = isProduction
  ? getRequiredEnv("URL_FRONTEND_PROD")
  : getRequiredEnv("URL_FRONTEND_DEV");

const mongodbUri =
  process.env.MONGODB_URI ||
  (isProduction ? getRequiredEnv("DB_CONN_PROD") : getRequiredEnv("DB_CONN_DEV"));

const corsOrigins = (process.env.CORS_ORIGINS || frontendUrl)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 5000),
  mongodbUri,
  frontendUrl,
  corsOrigins,
  jwtSecret: getRequiredEnv("SECRETORPRIVATEKEY"),
  accessTokenCookieName: "flypack_access_token",
  refreshTokenCookieName: "flypack_refresh_token",
  accessTokenExpiresIn: "15m",
  accessTokenMaxAgeMs: 15 * 60 * 1000,
  refreshTokenMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  runSeedersOnStart: process.env.RUN_SEEDERS_ON_START === "true",
};
