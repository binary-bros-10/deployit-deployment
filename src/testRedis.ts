import "dotenv/config";
import { redis } from "./config/redis";

async function test() {
  try {
    await redis.set("test", "hello");
    const value = await redis.get("test");

    console.log(value);
  } finally {
    redis.disconnect();
    process.exit(0);
  }
}

test();
