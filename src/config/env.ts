import "dotenv/config";

type Environment = "development" | "production" | "test";

interface AppConfig {
  port: number;
  nodeEnv: Environment;
  redisUrl: string;
  backendUrl: string;
}

const requiredVariables = ["PORT", "NODE_ENV", "REDIS_URL", "BACKEND_URL"] as const;

function getRequiredEnv(name: (typeof requiredVariables)[number]): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePort(value: string): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
}

function parseNodeEnv(value: string): Environment {
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }

  throw new Error("NODE_ENV must be one of: development, production, test");
}

export const env: AppConfig = {
  port: parsePort(getRequiredEnv("PORT")),
  nodeEnv: parseNodeEnv(getRequiredEnv("NODE_ENV")),
  redisUrl: getRequiredEnv("REDIS_URL"),
  backendUrl: getRequiredEnv("BACKEND_URL"),
};

