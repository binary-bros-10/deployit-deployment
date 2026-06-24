import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { deploymentQueue } from "../queues/deploymentQueue";
import { dockerService } from "../services/docker";
import type {
  DeploymentJobData,
  DeploymentJobResult,
} from "../workers/DeploymentWorker";

interface DeployRequestBody {
  repoUrl?: unknown;
  branch?: unknown;
}

const router = Router();

function isDeployRequestBody(body: DeployRequestBody): body is {
  repoUrl: string;
  branch?: string;
} {
  const hasValidRepoUrl = typeof body.repoUrl === "string" && body.repoUrl !== "";
  const hasValidBranch =
    body.branch === undefined ||
    (typeof body.branch === "string" && body.branch !== "");

  return hasValidRepoUrl && hasValidBranch;
}

router.post("/deploy", async (req, res, next) => {
  try {
    const body = req.body as DeployRequestBody;

    if (!isDeployRequestBody(body)) {
      res.status(400).json({
        success: false,
        message: "repoUrl is required and branch must be a string when provided",
      });
      return;
    }

    const deploymentId = uuidv4();
    const jobData: DeploymentJobData = {
      deploymentId,
      repoUrl: body.repoUrl,
      branch: body.branch,
    };

    await deploymentQueue.add("deploy", jobData, {
      jobId: deploymentId,
    });

    res.status(202).json({
      success: true,
      deploymentId,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/status/:deploymentId", async (req, res, next) => {
  try {
    const { deploymentId } = req.params;
    const job = await deploymentQueue.getJob(deploymentId);

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Deployment job not found",
      });
      return;
    }

    const state = await job.getState();

    res.json({
      success: true,
      deploymentId,
      status: state,
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/logs/:deploymentId", async (req, res, next) => {
  try {
    const { deploymentId } = req.params;
    const job = await deploymentQueue.getJob(deploymentId);

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Deployment job not found",
      });
      return;
    }

    const state = await job.getState();

    if (state !== "completed") {
      res.status(409).json({
        success: false,
        message: "Deployment has not completed yet",
        status: state,
      });
      return;
    }

    const result = job.returnvalue as DeploymentJobResult | null;

    if (!result?.containerId) {
      res.status(404).json({
        success: false,
        message: "Container details are not available for this deployment",
      });
      return;
    }

    const logs = await dockerService.getContainerLogs(result.containerId);

    res.json({
      success: true,
      deploymentId,
      containerId: result.containerId,
      logs,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/redeploy/:deploymentId", (_req, res) => {
  res.status(501).json({
    success: false,
    message: "Redeploy is not implemented yet",
  });
});

export default router;

