import { EcosystemSupport } from '../ecosystems/index.js';

export abstract class Reporter {
  constructor(
    private flags: unknown,
    public ecosystems: EcosystemSupport<string>[],
  ) {
    if (ecosystems.length === 0) {
      throw new Error('At least one ecosystem must be supported');
    }
  }
  abstract reportDependencyDebt(): Promise<void>;
}
