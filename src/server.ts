import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`Deployment Service running on port ${PORT}`);
});