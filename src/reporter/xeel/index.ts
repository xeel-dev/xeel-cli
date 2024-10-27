import chalk from 'chalk';
import type { EcosystemSupport } from '../../ecosystems/index.js';
import { Reporter } from '../index.js';
import GitHubAuthProvider from './auth-providers/github.js';
import XeelAuthProvider from './auth-providers/xeel.js';
import { DebtAPI } from './graphql/apis/debt.js';
import { ProjectAPI } from './graphql/apis/project.js';
import { XeelGraphQLClientFactory } from './graphql/client.js';
import { gitRemoteResolver } from './remotes/index.js';

export default class XeelReporter extends Reporter {
  private clientFactory: XeelGraphQLClientFactory;
  private repositoryId?: string;
  private isReady: Promise<void>;
  constructor(flags: unknown, ecosystems: EcosystemSupport<string>[]) {
    super(flags, ecosystems);
    if (typeof flags !== 'object' || !flags) {
      throw new Error('Flags must be an object');
    }
    this.isReady = this.getRepositoryId(flags).then((repositoryId) => {
      this.repositoryId = repositoryId;
    });
    this.clientFactory = new XeelGraphQLClientFactory(
      this.getAuthProvider(flags),
    );
  }

  public async init() {
    return this.isReady;
  }

  private async getRepositoryId(flags: unknown) {
    const repositoryId = (flags as { repository: string }).repository;
    const store =
      (flags as { 'store-metadata': boolean })['store-metadata'] ?? true;
    if (!repositoryId) {
      // If no repository ID is provided, we'll try to find it from the
      // git remote URL, and the relevant provider's API.
      const id = await gitRemoteResolver.resolveRepositoryId({ store });
      if (!id) {
        throw new Error('Failed to resolve repository ID');
      }
      return id;
    }
    return repositoryId;
  }

  private getAuthProvider(flags: unknown) {
    const selectedProvider = (flags as { auth: string }).auth;
    switch (selectedProvider) {
      case 'github':
        return new GitHubAuthProvider(
          (flags as { organization: string }).organization,
        );
      case 'xeel':
        return new XeelAuthProvider();
      default:
        throw new Error('Invalid auth provider');
    }
  }

  async reportDependencyDebt() {
    await this.isReady;
    if (!this.repositoryId) {
      throw new Error('Repository ID is not set');
    }
    const rootProjects = (
      await Promise.all(
        this.ecosystems.map((ecosystem) => ecosystem.findProjects()),
      )
    ).flat();
    const ecosystemByName = this.ecosystems.reduce(
      (acc, ecosystem) => {
        acc[ecosystem.name] = ecosystem;
        return acc;
      },
      {} as Record<string, EcosystemSupport<string>>,
    );
    if (rootProjects.length === 0) {
      console.log('No projects found');
      return;
    }
    // In order to find 'the one true root project', aka the project that
    // we are going to link to the repository ID and hang all the other
    // projects off of, we need to find the project with the path that is
    // shortest. This is because the root project is the one that is
    // closest to the root of the repository.
    // If there are multiple projects with the same path length, we'll
    // pick the one with the most sub-projects.
    const rootProject = rootProjects.reduce((acc, project) => {
      if (project.path.length < acc.path.length) {
        return project;
      }
      if (project.path.length === acc.path.length) {
        if (project.subProjects?.length > acc.subProjects?.length) {
          return project;
        }
      }
      return acc;
    });
    if (!rootProject) {
      return;
    }
    console.log(
      `Using root project: ${chalk.underline(rootProject.name)} at ${rootProject.path}`,
    );
    const client = await this.clientFactory.getClient();
    if (!client) {
      throw new Error('Failed to construct Xeel GraphQL client');
    }
    const projectApi = new ProjectAPI(client);
    const debtApi = new DebtAPI(client);

    const rootProjectId = await projectApi.upsertProjectByRepository(
      this.repositoryId,
      rootProject.name,
      rootProject.description,
    );
    const rootProjectDependencies =
      await ecosystemByName[rootProject.ecosystem].listOutdatedDependencies(
        rootProject,
      );
    console.log(
      `Root project ${chalk.underline(rootProject.name)} has ${chalk.inverse(rootProjectDependencies.length)} outdated dependencies`,
    );
    await debtApi.upsertDebt(rootProjectId, rootProjectDependencies);
    for (const subProject of rootProject.subProjects ?? []) {
      const subProjectId = await projectApi.upsertProjectByParentProjectId(
        rootProjectId,
        subProject.name,
        subProject.description,
      );
      const subProjectDependencies =
        await ecosystemByName[subProject.ecosystem].listOutdatedDependencies(
          subProject,
        );
      console.log(
        `Subproject ${chalk.underline(subProject.name)} has ${chalk.inverse(subProjectDependencies.length)} outdated dependencies`,
      );
      await debtApi.upsertDebt(subProjectId, subProjectDependencies);
    }

    for (const project of rootProjects) {
      if (project === rootProject) {
        continue;
      }
      const parentProjectId = await projectApi.upsertProjectByParentProjectId(
        rootProjectId,
        project.name,
        project.description,
      );
      const dependencies =
        await ecosystemByName[project.ecosystem].listOutdatedDependencies(
          project,
        );
      await debtApi.upsertDebt(parentProjectId, dependencies);
      for (const subProject of project.subProjects ?? []) {
        const subProjectId = await projectApi.upsertProjectByParentProjectId(
          parentProjectId,
          subProject.name,
          subProject.description,
        );
        const subProjectDependencies =
          await ecosystemByName[subProject.ecosystem].listOutdatedDependencies(
            subProject,
          );
        console.log(
          `Subproject ${chalk.underline(subProject.name)} has ${chalk.inverse(subProjectDependencies.length)} outdated dependencies`,
        );
        await debtApi.upsertDebt(subProjectId, subProjectDependencies);
      }
    }
  }
}
