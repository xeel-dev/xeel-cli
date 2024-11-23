import { EcosystemSupport } from '../ecosystems/index.js';

interface Log {
  message: string;
  details?: string;
}

export interface ReportSummary {
  errors: Log[];
  warnings: Log[];
  success: boolean;
}

export abstract class Reporter {
  public isVerbose: boolean;
  constructor(
    private flags: unknown,
    public ecosystems: EcosystemSupport<string>[],
  ) {
    if (typeof flags !== 'object' || !flags) {
      throw new Error('Flags must be an object');
    }
    if (ecosystems.length === 0) {
      throw new Error('At least one ecosystem must be supported');
    }
    this.isVerbose = (flags as { verbose: boolean }).verbose;
  }
  abstract reportDependencyDebt(): Promise<ReportSummary>;
}
