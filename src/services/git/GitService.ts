import fs from "fs/promises";
import path from "path";
import simpleGit, { SimpleGit } from "simple-git";

const repositoriesDirectory = path.resolve(process.cwd(), "repositories");

function resolveRepositoryPath(destination: string): string {
  if (!destination.trim()) {
    throw new Error("Repository destination is required");
  }

  const resolvedPath = path.resolve(repositoriesDirectory, destination);
  const isInsideRepositories =
    resolvedPath === repositoriesDirectory ||
    resolvedPath.startsWith(`${repositoriesDirectory}${path.sep}`);

  if (!isInsideRepositories) {
    throw new Error("Repository path must be inside the repositories directory");
  }

  return resolvedPath;
}

export class GitService {
  private readonly git: SimpleGit;

  constructor(git: SimpleGit = simpleGit()) {
    this.git = git;
  }

  async cloneRepo(repoUrl: string, destination: string): Promise<string> {
    const repositoryPath = resolveRepositoryPath(destination);

    await fs.mkdir(repositoriesDirectory, { recursive: true });
    await this.git.clone(repoUrl, repositoryPath);

    return repositoryPath;
  }

  async deleteRepo(repositoryPath: string): Promise<void> {
    const resolvedPath = resolveRepositoryPath(repositoryPath);

    await fs.rm(resolvedPath, {
      recursive: true,
      force: true,
    });
  }

  async checkoutBranch(repositoryPath: string, branch: string): Promise<void> {
    if (!branch.trim()) {
      throw new Error("Branch name is required");
    }

    const resolvedPath = resolveRepositoryPath(repositoryPath);
    const repositoryGit = simpleGit(resolvedPath);

    await repositoryGit.checkout(branch);
  }
}

export const gitService = new GitService();

