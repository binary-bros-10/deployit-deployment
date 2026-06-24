import fs from "fs/promises";
import path from "path";

export type Framework = "node" | "express" | "react" | "nextjs" | "unknown";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function hasDependency(packageJson: PackageJson, dependencyName: string): boolean {
  return Boolean(
    packageJson.dependencies?.[dependencyName] ||
      packageJson.devDependencies?.[dependencyName]
  );
}

export class FrameworkDetector {
  async detect(repositoryPath: string): Promise<Framework> {
    const packageJsonPath = path.join(repositoryPath, "package.json");

    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;

      if (hasDependency(packageJson, "next")) {
        return "nextjs";
      }

      if (hasDependency(packageJson, "react")) {
        return "react";
      }

      if (hasDependency(packageJson, "express")) {
        return "express";
      }

      return "node";
    } catch (error) {
      if (error instanceof SyntaxError) {
        return "unknown";
      }

      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === "ENOENT") {
        return "unknown";
      }

      throw error;
    }
  }
}

export const frameworkDetector = new FrameworkDetector();

