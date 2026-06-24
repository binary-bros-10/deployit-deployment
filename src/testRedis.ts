import { redis } from "./config/redis";

async function test() {
  await redis.set("test", "hello");
  const value = await redis.get("test");

  console.log(value);

  process.exit(0);
}

test();