export interface GitProvider {
  supports(remoteUrl: string): boolean;
  getRepositoryId(remoteUrl: string): Promise<string>;
}
