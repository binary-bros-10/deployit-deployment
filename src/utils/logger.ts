import fs from "fs";
import path from "path";
import winston from "winston";

const logsDirectory = path.resolve(process.cwd(), "logs");

fs.mkdirSync(logsDirectory, { recursive: true });

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDirectory, "combined.log"),
    }),
    new winston.transports.File({
      filename: path.join(logsDirectory, "error.log"),
      level: "error",
    }),
  ],
});

