import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { env } from "./config/env";
import { deploymentWorker } from "./workers";

const PORT = env.port;

app.listen(PORT, () => {
  deploymentWorker.on("ready", () => {
    console.log("Deployment worker is ready");
  });

  console.log(`Deployment Service running on port ${PORT}`);
});
