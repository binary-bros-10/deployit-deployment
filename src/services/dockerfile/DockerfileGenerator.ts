import fs from "fs/promises";
import path from "path";
import type { Framework } from "../framework";
import { dockerfileTemplates } from "./dockerfileTemplates";

type SupportedDockerfileFramework = Exclude<Framework, "unknown">;

function isSupportedFramework(
  framework: Framework
): framework is SupportedDockerfileFramework {
  return framework !== "unknown";
}

export async function generateDockerfile(
  framework: Framework,
  repositoryPath: string
): Promise<string> {
  if (!isSupportedFramework(framework)) {
    throw new Error("Cannot generate Dockerfile for unknown framework");
  }

  const dockerfilePath = path.join(repositoryPath, "Dockerfile");
  const template = dockerfileTemplates[framework];

  await fs.writeFile(dockerfilePath, template, "utf-8");

  return dockerfilePath;
}

