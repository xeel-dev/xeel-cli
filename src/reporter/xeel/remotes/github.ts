import chalk from 'chalk';
import open from 'open';
import { GitProvider } from './provider.js';

const GITHUB_CLIENT_ID = 'Ov23li5X2014SeWgouT1';
/**
 * Unfortunately GitHub does not support the PKCE code challenge method,
 * so we use the device code oauth flow instead.
 */
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
/**
 * Unfortunately there is no "read only" scope for GitHub OAuth,
 * so we have to request full access to all the user's repositories.
 */
const GITHUB_SCOPE = 'repo';

export class GitHubProvider implements GitProvider {
  public supports(remoteUrl: string) {
    return remoteUrl.includes('github.com');
  }

  private async requestDeviceCode() {
    const response = await fetch(GITHUB_DEVICE_CODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: GITHUB_SCOPE,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request device code: ${response.statusText}`);
    }

    return response.json();
  }

  private async pollForAccessToken(deviceCode: string): Promise<string> {
    let hasLogged = false;
    while (true) {
      const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      const data = await response.json();
      const { access_token: accessToken, error } = data;

      if (accessToken) {
        return accessToken;
      }

      if (error === 'authorization_pending') {
        !hasLogged &&
          console.log(chalk.dim('Waiting for user authorization...'));
        hasLogged = true;
        await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
      } else {
        throw new Error(`Error: ${data.error_description}`);
      }
    }
  }

  private async fetchPrivateRepositoryId(accessToken: string, slug: string) {
    const response = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Initiates a GitHub OAuth flow to get the repository ID
   * for a private repository.
   */
  private async getPrivateRepositoryId(repositorySlug: string) {
    const { device_code, user_code, verification_uri } =
      await this.requestDeviceCode();

    console.log('Verification code:', chalk.bold.underline(user_code));

    console.log(chalk.blue('Opening browser to complete authentication…'));
    open(verification_uri);

    const accessToken = await this.pollForAccessToken(device_code);
    return this.fetchPrivateRepositoryId(accessToken, repositorySlug);
  }

  public async getRepositoryId(remoteUrl: string) {
    let repositoryId: string | undefined;
    const match = remoteUrl.match(/github\.com\/([^/]+)\/([^/\.]+)?/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    const repositorySlug = `${match[1]}/${match[2]}`;

    // Check if the repository is publicly accessible
    const response = await fetch(
      `https://api.github.com/repos/${repositorySlug}`,
    );
    if (!response.ok) {
      console.log(
        'Repository looks like a private repository, starting OAuth flow to determine the repository ID…',
      );
      repositoryId = await this.getPrivateRepositoryId(repositorySlug);
    } else {
      const repository = await response.json();
      repositoryId = repository.id;
    }
    if (!repositoryId) {
      throw new Error('Failed to fetch repository ID');
    }
    console.log(`Resolved repository ID: ${repositoryId}`);
    return repositoryId;
  }
}
