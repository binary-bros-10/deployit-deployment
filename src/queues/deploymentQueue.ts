import { Queue } from "bullmq";
import { redis } from "../config/redis";
import { QUEUE_NAMES } from "./queueNames";

export const deploymentQueue = new Queue(QUEUE_NAMES.DEPLOYMENT, {
  connection: {
    ...redis.options,
  },
});
