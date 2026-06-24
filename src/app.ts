import express from "express";
import cors from "cors";
import deploymentRoutes from "./routes/deploymentRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "DeployIt Deployment Service Running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "deployment-service"
  });
});

app.use(deploymentRoutes);

export default app;
