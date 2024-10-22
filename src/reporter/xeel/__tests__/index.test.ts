import { describe, expect, it, vi } from 'vitest';
import { EcosystemSupport } from '../../../ecosystems/index.js';
import XeelReporter from '../index.js';

vi.mock('open');
vi.mock('@actions/core', () => ({
  getIDToken: async () => 'token',
}));

describe('XeelReporter', () => {
  it('should throw an error if no ecosystems are provided', () => {
    expect(() => new XeelReporter({}, [])).toThrow(
      'At least one ecosystem must be supported',
    );
  });
  it('should throw an error if flags is not an object', () => {
    expect(
      () => new XeelReporter(null, [{} as EcosystemSupport<string>]),
    ).toThrow('Flags must be an object');
  });

  it('should throw an error if invalid auth provider is provided', () => {
    expect(
      () =>
        new XeelReporter({ repository: 'repo', auth: 'invalid' }, [
          {} as EcosystemSupport<string>,
        ]),
    ).toThrow('Invalid auth provider');
  });

  it('should create an instance with GitHubAuthProvider', () => {
    const CI = process.env.CI;
    process.env.CI = 'true';
    const reporter = new XeelReporter(
      { repository: 'repo', auth: 'github', organization: 'org' },
      [{} as EcosystemSupport<string>],
    );
    expect(reporter).toBeInstanceOf(XeelReporter);
    process.env.CI = CI;
  });

  it('should create an instance with XeelAuthProvider', () => {
    const CI = process.env.CI;
    delete process.env.CI;
    const reporter = new XeelReporter({ repository: 'repo', auth: 'xeel' }, [
      {} as EcosystemSupport<string>,
    ]);
    expect(reporter).toBeInstanceOf(XeelReporter);
    process.env.CI = CI;
  });
});
