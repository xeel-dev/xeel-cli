import { getIDToken } from '@actions/core';
import { apiBaseUrl } from '../constants.js';
import { AuthProvider } from './index.js';

export default class GitHubAuthProvider implements AuthProvider {
  constructor(private readonly organizationId: string) {
    if (!organizationId) {
      throw new Error('Organization ID is required when using GitHub auth');
    }
  }
  async getHeaders() {
    if (!process.env.CI) {
      throw new Error('GitHub Actions authentication is only available in CI');
    }
    try {
      const token = await getIDToken(apiBaseUrl);
      const headers = new Headers({
        Authorization: `Bearer ${token}`,
        'x-xeel-organization-id': this.organizationId,
      });
      return headers;
    } catch (error) {
      throw new Error('Failed to authenticate with GitHub Actions');
    }
  }
}
