export interface Project<T extends string> {
  /**
   * The name of the project.
   * @example '@xeel-dev/cli'
   */
  name: string;
  /**
   * The description of the project.
   * @example 'A CLI tool for managing projects.'
   */
  description?: string;
  /**
   * The path to the project directory.
   * @example '/path/to/project'
   */
  path: string;
  /**
   * The name of the ecosystem the project belongs to.
   * @example 'NPM'
   */
  ecosystem: T;
}

export interface RootProject<T extends string> extends Project<T> {
  subProjects: Project<T>[];
}

export interface Release {
  /**
   * The date the release was published.
   */
  date: Date;
  /**
   * Indicates if the release is deprecated.
   */
  isDeprecated: boolean;
  /**
   * The version of the release.
   */
  version: string;
}

export type DependencyType = 'DEV' | 'PROD';

export interface Dependency<T extends string> {
  /**
   * The name of the dependency.
   */
  name: string;
  /**
   * The type of the dependency.
   * DEV: Development dependency.
   * PROD: Production (runtime) dependency.
   */
  type: DependencyType;
  /**
   * The name of the ecosystem the dependency belongs to.
   */
  ecosystem: T;
  /**
   * The current version of the dependency.
   */
  current: Release;
  /**
   * The latest version of the dependency.
   */
  latest: Release;
}

export interface EcosystemSupport<T extends string> {
  /**
   * The name of the ecosystem
   * @example 'NPM'
   */
  get name(): T;
  /**
   * Find all projects in the current directory.
   */
  findProjects(): Promise<RootProject<T>[]>;
  /**
   * List all outdated dependencies for a project.
   */
  listOutdatedDependencies(project: Project<T>): Promise<Dependency<T>[]>;
}
