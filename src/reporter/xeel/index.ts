import chalk from 'chalk';
import type {
  EcosystemSupport,
  Project,
  RootProject,
} from '../../ecosystems/index.js';
import { Reporter, ReportSummary } from '../index.js';
import GitHubAuthProvider from './auth-providers/github.js';
import { NoOpAuthProvider } from './auth-providers/index.js';
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
    this.isReady = this.getRepositoryId(flags).then((repositoryId) => {
      this.repositoryId = repositoryId;
    });
    this.clientFactory = new XeelGraphQLClientFactory(
      this.getAuthProvider(flags),
    );
    if (process.env.NO_COLOR || process.env.CI) {
      console.log('Disabling color output…');
      chalk.level = 0;
    }
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
    if (selectedProvider === 'none') {
      const repositoryId = (flags as { repository: string }).repository;
      // Check if the repository ID provided is a GitHub repository URL
      // If so, this is a public repository and we can skip authentication
      if (repositoryId.includes('github.com/')) {
        return new NoOpAuthProvider();
      }
    }
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
    const summary: ReportSummary = {
      errors: [],
      warnings: [],
      success: true,
    };
    if (!this.repositoryId) {
      throw new Error('Repository ID is not set');
    }
    const findResults = await Promise.allSettled(
      this.ecosystems.map((ecosystem) => ecosystem.findProjects()),
    );
    const rootProjects = findResults.reduce((acc, result) => {
      if (result.status === 'fulfilled') {
        acc.push(...result.value);
      }
      if (result.status === 'rejected') {
        summary.errors.push({
          message: 'Failed to find projects',
          details: result.reason,
        });
      }
      return acc;
    }, [] as RootProject<string>[]);
    const ecosystemByName = this.ecosystems.reduce(
      (acc, ecosystem) => {
        acc[ecosystem.name] = ecosystem;
        return acc;
      },
      {} as Record<string, EcosystemSupport<string>>,
    );
    if (rootProjects.length === 0) {
      summary.warnings.push({
        message: 'No projects found',
      });
      summary.success = false;
      return summary;
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
      summary.errors.push({
        message: 'Failed to find root project',
      });
      summary.success = false;
      return summary;
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
    try {
      const ecosystem = ecosystemByName[rootProject.ecosystem];
      const rootProjectDependencies =
        await ecosystem.listOutdatedDependencies(rootProject);

      console.log(
        `Root project ${chalk.underline(rootProject.name)} has ${chalk.inverse(rootProjectDependencies.length)} outdated dependencies`,
      );

      const rootProjectId = await projectApi.upsertProjectByRepository(
        this.repositoryId,
        rootProject.name,
        rootProject.description,
      );
      let totalDependencies = undefined;
      if (ecosystem.countDependencies) {
        totalDependencies = await ecosystem.countDependencies(rootProject);
      }
      await debtApi.upsertDebt(
        rootProjectId,
        rootProjectDependencies,
        totalDependencies,
      );

      for (const subProject of rootProject.subProjects ?? []) {
        try {
          const ecosystem = ecosystemByName[subProject.ecosystem];
          const subProjectDependencies =
            await ecosystem.listOutdatedDependencies(subProject);
          console.log(
            `Subproject ${chalk.underline(subProject.name)} has ${chalk.inverse(subProjectDependencies.length)} outdated dependencies`,
          );
          const subProjectId = await projectApi.upsertProjectByParentProjectId(
            rootProjectId,
            subProject.name,
            subProject.description,
          );
          let totalDependencies = undefined;
          if (ecosystem.countDependencies) {
            totalDependencies = await ecosystem.countDependencies(subProject);
          }
          await debtApi.upsertDebt(
            subProjectId,
            subProjectDependencies,
            totalDependencies,
          );
        } catch (error) {
          summary.errors.push({
            message: 'Failed to report version debt',
            details: JSON.stringify(error),
          });
          this.logError(subProject, error);
        }
      }

      for (const project of rootProjects) {
        if (project === rootProject) {
          continue;
        }
        try {
          const ecosystem = ecosystemByName[project.ecosystem];
          const dependencies =
            await ecosystem.listOutdatedDependencies(project);
          const parentProjectId =
            await projectApi.upsertProjectByParentProjectId(
              rootProjectId,
              project.name,
              project.description,
            );
          console.log(
            `Project ${chalk.underline(project.name)} has ${chalk.inverse(dependencies.length)} outdated dependencies`,
          );
          let totalDependencies = undefined;
          if (ecosystem.countDependencies) {
            totalDependencies = await ecosystem.countDependencies(project);
          }
          await debtApi.upsertDebt(
            parentProjectId,
            dependencies,
            totalDependencies,
          );
          for (const subProject of project.subProjects ?? []) {
            try {
              const ecosystem = ecosystemByName[subProject.ecosystem];
              const subProjectDependencies =
                await ecosystem.listOutdatedDependencies(subProject);
              console.log(
                `Subproject ${chalk.underline(subProject.name)} has ${chalk.inverse(subProjectDependencies.length)} outdated dependencies`,
              );

              const subProjectId =
                await projectApi.upsertProjectByParentProjectId(
                  parentProjectId,
                  subProject.name,
                  subProject.description,
                );

              let totalDependencies = undefined;
              if (ecosystem.countDependencies) {
                totalDependencies =
                  await ecosystem.countDependencies(subProject);
              }
              await debtApi.upsertDebt(
                subProjectId,
                subProjectDependencies,
                totalDependencies,
              );
            } catch (error) {
              summary.errors.push({
                message: 'Failed to report version debt',
                details: JSON.stringify(error),
              });
              this.logError(subProject, error);
            }
          }
        } catch (error) {
          summary.errors.push({
            message: 'Failed to report version debt',
            details: JSON.stringify(error),
          });
          this.logError(project, error);
        }
      }
    } catch (error) {
      summary.errors.push({
        message: 'Failed to report version debt',
        details: JSON.stringify(error),
      });
      this.logError(rootProject, error);
    }
    return summary;
  }

  private logError(subProject: Project<string>, error: unknown) {
    if (this.isVerbose) {
      console.error('Failed to report version debt', {
        project: subProject.name,
        ecosystem: subProject.ecosystem,
        error,
      });
    }
  }
}
