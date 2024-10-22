import { exec } from '../../../utils/exec.js';
import { GitHubProvider } from './github.js';

class GitRemoteResolver {
  private providers = [new GitHubProvider()];

  private async getRemoteUrl(): Promise<string> {
    const { exitCode, stdout } = await exec('git remote get-url origin');
    if (exitCode !== 0 || !stdout) {
      throw new Error('No remote URL found. Is this a git repository?');
    }
    return stdout.trim();
  }

  public async resolveRepositoryId({
    store,
  }: {
    store: boolean;
  }): Promise<string> {
    // Read the repository ID from the xeel.repositoryId git config
    try {
      const { exitCode, stdout } = await exec('git config xeel.repositoryId');
      if (exitCode === 0 && stdout) {
        return stdout.trim();
      }
    } catch (error) {
      // Ignore error if the config is not set
    }
    const remoteUrl = await this.getRemoteUrl();
    // Check if the remote URL is supported by any of the known providers
    for (const provider of this.providers) {
      if (provider.supports(remoteUrl)) {
        const id = await provider.getRepositoryId(remoteUrl);
        if (store) {
          await exec(`git config --local xeel.repositoryId ${id}`);
        }
        return id;
      }
    }
    throw new Error('No provider found for the given remote URL');
  }
}

const gitRemoteResolver = new GitRemoteResolver();
export { gitRemoteResolver };
