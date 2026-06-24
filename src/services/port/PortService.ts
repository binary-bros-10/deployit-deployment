import fs from "fs/promises";
import path from "path";

interface PortStore {
  allocatedPorts: number[];
}

const minimumPort = 3000;
const maximumPort = 10000;
const dataDirectory = path.resolve(process.cwd(), "data");
const portStorePath = path.join(dataDirectory, "ports.json");

async function readPortStore(): Promise<PortStore> {
  try {
    const content = await fs.readFile(portStorePath, "utf-8");
    const parsed = JSON.parse(content) as Partial<PortStore>;

    return {
      allocatedPorts: Array.isArray(parsed.allocatedPorts)
        ? parsed.allocatedPorts.filter(Number.isInteger)
        : [],
    };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return { allocatedPorts: [] };
    }

    if (error instanceof SyntaxError) {
      throw new Error("Invalid port store file: data/ports.json");
    }

    throw error;
  }
}

async function writePortStore(portStore: PortStore): Promise<void> {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(
    portStorePath,
    `${JSON.stringify(portStore, null, 2)}\n`,
    "utf-8"
  );
}

export class PortService {
  async allocatePort(): Promise<number> {
    const portStore = await readPortStore();
    const allocatedPorts = new Set(portStore.allocatedPorts);

    for (let port = minimumPort; port <= maximumPort; port += 1) {
      if (!allocatedPorts.has(port)) {
        const updatedPorts = [...allocatedPorts, port].sort((a, b) => a - b);

        await writePortStore({ allocatedPorts: updatedPorts });

        return port;
      }
    }

    throw new Error("No available ports between 3000 and 10000");
  }

  async releasePort(port: number): Promise<void> {
    if (!Number.isInteger(port) || port < minimumPort || port > maximumPort) {
      throw new Error("Port must be an integer between 3000 and 10000");
    }

    const portStore = await readPortStore();
    const allocatedPorts = portStore.allocatedPorts.filter(
      (allocatedPort) => allocatedPort !== port
    );

    await writePortStore({ allocatedPorts });
  }
}

export const portService = new PortService();

