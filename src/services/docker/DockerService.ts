import fs from "fs/promises";
import path from "path";

const Docker = require("dockerode");

interface BuildProgress {
  stream?: string;
  error?: string;
}

interface DockerContainer {
  id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  remove(options?: { force?: boolean }): Promise<void>;
  logs(options: {
    stdout: boolean;
    stderr: boolean;
    timestamps: boolean;
    follow: boolean;
  }): Promise<Buffer>;
}

interface DockerImage {
  inspect(): Promise<{
    Config?: {
      ExposedPorts?: Record<string, unknown>;
    };
  }>;
}

interface DockerClient {
  modem: {
    followProgress(
      stream: NodeJS.ReadableStream,
      callback: (error: Error | null, output: BuildProgress[]) => void
    ): void;
  };
  buildImage(
    context: { context: string; src: string[] },
    options: { t: string }
  ): Promise<NodeJS.ReadableStream>;
  createContainer(options: {
    Image: string;
    ExposedPorts: Record<string, unknown>;
    HostConfig: {
      PortBindings: Record<string, Array<{ HostPort: string }>>;
      RestartPolicy: { Name: string };
    };
  }): Promise<DockerContainer>;
  getContainer(containerId: string): DockerContainer;
  getImage(imageTag: string): DockerImage;
}

const defaultContainerPort = "3000/tcp";
const ignoredBuildEntries = new Set([
  ".git",
  "node_modules",
  "dist",
  "logs",
  "repositories",
]);

async function getBuildContextFiles(
  repositoryPath: string,
  currentPath = repositoryPath
): Promise<string[]> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (ignoredBuildEntries.has(entry.name)) {
        return [];
      }

      const absolutePath = path.join(currentPath, entry.name);
      const relativePath = path.relative(repositoryPath, absolutePath);

      if (entry.isDirectory()) {
        return getBuildContextFiles(repositoryPath, absolutePath);
      }

      if (entry.isFile()) {
        return [relativePath];
      }

      return [];
    })
  );

  return files.flat();
}

function decodeDockerLogBuffer(logBuffer: Buffer): string {
  const chunks: Buffer[] = [];
  let offset = 0;

  while (offset + 8 <= logBuffer.length) {
    const payloadLength = logBuffer.readUInt32BE(offset + 4);
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + payloadLength;

    if (payloadLength <= 0 || payloadEnd > logBuffer.length) {
      return logBuffer.toString("utf-8");
    }

    chunks.push(logBuffer.subarray(payloadStart, payloadEnd));
    offset = payloadEnd;
  }

  if (chunks.length === 0) {
    return logBuffer.toString("utf-8");
  }

  return Buffer.concat(chunks).toString("utf-8");
}

export class DockerService {
  private readonly docker: DockerClient;

  constructor(docker: DockerClient = new Docker()) {
    this.docker = docker;
  }

  async buildImage(repositoryPath: string, imageTag: string): Promise<string> {
    const buildContextFiles = await getBuildContextFiles(repositoryPath);
    const stream = await this.docker.buildImage(
      {
        context: repositoryPath,
        src: buildContextFiles,
      },
      { t: imageTag }
    );

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (error, output) => {
        if (error) {
          reject(error);
          return;
        }

        const buildError = output.find((item) => item.error);

        if (buildError?.error) {
          reject(new Error(buildError.error));
          return;
        }

        resolve();
      });
    });

    return imageTag;
  }

  async runContainer(imageTag: string, port: number): Promise<string> {
    const image = this.docker.getImage(imageTag);
    const imageDetails = await image.inspect();
    const exposedPorts = imageDetails.Config?.ExposedPorts;
    const containerPort = exposedPorts
      ? Object.keys(exposedPorts)[0] || defaultContainerPort
      : defaultContainerPort;

    const container = await this.docker.createContainer({
      Image: imageTag,
      ExposedPorts: {
        [containerPort]: {},
      },
      HostConfig: {
        PortBindings: {
          [containerPort]: [{ HostPort: String(port) }],
        },
        RestartPolicy: {
          Name: "unless-stopped",
        },
      },
    });

    await container.start();

    return container.id;
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);

    await container.stop();
  }

  async deleteContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);

    await container.remove({ force: true });
  }

  async getContainerLogs(containerId: string): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: true,
      follow: false,
    });

    return decodeDockerLogBuffer(logs);
  }
}

export const dockerService = new DockerService();

