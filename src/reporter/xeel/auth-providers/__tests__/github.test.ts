import { getIDToken } from '@actions/core';
import { describe, expect, it, Mock, vi } from 'vitest';
import GitHubAuthProvider from '../github.js';

vi.mock('@actions/core', () => ({
  getIDToken: vi.fn(),
}));

describe('GitHubAuthProvider', () => {
  const organizationId = 'test-org-id';

  it('should throw an error if organizationId is not provided', () => {
    expect(() => new GitHubAuthProvider('')).toThrow(
      'Organization ID is required when using GitHub auth',
    );
  });

  it('should throw an error if not running in CI environment', async () => {
    const CI = process.env.CI;
    delete process.env.CI;
    const authProvider = new GitHubAuthProvider(organizationId);
    await expect(authProvider.getHeaders()).rejects.toThrow(
      'GitHub Actions authentication is only available in CI',
    );
    process.env.CI = CI;
  });

  it('should return headers with valid token', async () => {
    const CI = process.env.CI;
    process.env.CI = 'true';
    const token = 'test-token';
    (getIDToken as Mock).mockResolvedValue(token);

    const authProvider = new GitHubAuthProvider(organizationId);
    const headers = await authProvider.getHeaders();

    expect(headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(headers.get('x-xeel-organization-id')).toBe(organizationId);

    process.env.CI = CI;
  });

  it('should throw an error if getIDToken fails', async () => {
    const CI = process.env.CI;

    process.env.CI = 'true';
    (getIDToken as Mock).mockRejectedValue(new Error('Failed to get token'));

    const authProvider = new GitHubAuthProvider(organizationId);
    await expect(authProvider.getHeaders()).rejects.toThrow(
      'Failed to authenticate with GitHub Actions',
    );

    process.env.CI = CI;
  });
});
