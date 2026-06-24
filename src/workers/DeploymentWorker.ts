import { Job, Worker } from "bullmq";
import { redis } from "../config/redis";
import { QUEUE_NAMES } from "../queues/queueNames";
import { dockerService } from "../services/docker";
import { generateDockerfile } from "../services/dockerfile";
import { frameworkDetector, type Framework } from "../services/framework";
import { gitService } from "../services/git";
import { portService } from "../services/port";
import { logger } from "../utils/logger";

export interface DeploymentJobData {
  deploymentId: string;
  repoUrl: string;
  branch?: string;
}

export interface DeploymentJobResult {
  deploymentId: string;
  framework: Exclude<Framework, "unknown">;
  imageTag: string;
  containerId: string;
  port: number;
}

function createRepositoryDestination(deploymentId: string): string {
  return deploymentId.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function createImageTag(deploymentId: string): string {
  const sanitizedDeploymentId = deploymentId
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "-");

  return `deployit-${sanitizedDeploymentId}:latest`;
}

function assertSupportedFramework(
  framework: Framework
): asserts framework is Exclude<Framework, "unknown"> {
  if (framework === "unknown") {
    throw new Error("Unable to detect a supported framework");
  }
}

export async function processDeploymentJob(
  job: Job<DeploymentJobData>
): Promise<DeploymentJobResult> {
  const { deploymentId, repoUrl, branch } = job.data;
  const repositoryDestination = createRepositoryDestination(deploymentId);
  const imageTag = createImageTag(deploymentId);
  let repositoryPath: string | null = null;
  let allocatedPort: number | null = null;
  let containerId: string | null = null;

  try {
    logger.info("Starting deployment job", {
      deploymentId,
      jobId: job.id,
    });

    repositoryPath = await gitService.cloneRepo(repoUrl, repositoryDestination);

    if (branch) {
      await gitService.checkoutBranch(repositoryDestination, branch);
    }

    const framework = await frameworkDetector.detect(repositoryPath);
    assertSupportedFramework(framework);

    await generateDockerfile(framework, repositoryPath);
    await dockerService.buildImage(repositoryPath, imageTag);

    allocatedPort = await portService.allocatePort();
    containerId = await dockerService.runContainer(imageTag, allocatedPort);

    logger.info("Deployment job completed", {
      deploymentId,
      framework,
      imageTag,
      containerId,
      port: allocatedPort,
    });

    return {
      deploymentId,
      framework,
      imageTag,
      containerId,
      port: allocatedPort,
    };
  } catch (error) {
    logger.error("Deployment job failed", {
      deploymentId,
      error,
    });

    if (containerId) {
      await dockerService.deleteContainer(containerId).catch((cleanupError) => {
        logger.error("Failed to cleanup deployment container", {
          deploymentId,
          containerId,
          error: cleanupError,
        });
      });
    }

    if (allocatedPort) {
      await portService.releasePort(allocatedPort).catch((cleanupError) => {
        logger.error("Failed to release deployment port", {
          deploymentId,
          port: allocatedPort,
          error: cleanupError,
        });
      });
    }

    if (repositoryPath) {
      await gitService.deleteRepo(repositoryDestination).catch((cleanupError) => {
        logger.error("Failed to cleanup cloned repository", {
          deploymentId,
          repositoryPath,
          error: cleanupError,
        });
      });
    }

    throw error;
  }
}

export const deploymentWorker = new Worker<DeploymentJobData, DeploymentJobResult>(
  QUEUE_NAMES.DEPLOYMENT,
  processDeploymentJob,
  {
    connection: {
      ...redis.options,
      maxRetriesPerRequest: null,
    },
  }
);

