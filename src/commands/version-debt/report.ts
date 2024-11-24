import { Command, Flags } from '@oclif/core';
import { EcosystemSupport } from '../../ecosystems/index.js';
import { ReportSummary } from '../../reporter/index.js';
import XeelReporter from '../../reporter/xeel/index.js';

export default class ReportDebt extends Command {
  static override description =
    'scan the current project for outdated dependencies and report them to Xeel';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    repository: Flags.string({
      char: 'r',
      description: 'Repository ID',
    }),
    'store-metadata': Flags.boolean({
      description: 'Controls whether repository metadata is stored on disk',
      default: true,
    }),
    organization: Flags.string({
      char: 'o',
      description: 'Xeel Organization ID',
    }),
    auth: Flags.string({
      char: 'a',
      description: 'Authentication provider to use for Xeel API',
      options: ['github', 'xeel', 'none'],
      default: 'xeel',
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Print verbose output',
      default: process.env.DEBUG ? true : false,
    }),
  };

  private processSummary(summary: ReportSummary, isVerbose: boolean): void {
    const errors = new Map<string, string[]>();
    const warnings = new Map<string, string[]>();
    for (const log of summary.errors) {
      errors.set(log.message, [
        ...(errors.get(log.message) ?? []),
        log.details ?? '',
      ]);
    }
    for (const log of summary.warnings) {
      warnings.set(log.message, [
        ...(warnings.get(log.message) ?? []),
        log.details ?? '',
      ]);
    }
    for (const [message, details] of errors) {
      console.error(`❌ ${message}`);
      if (isVerbose) {
        console.error(details.join('\n'));
      }
    }
    for (const [message, details] of warnings) {
      console.warn(`⚠️ ${message}`);
      if (isVerbose) {
        console.warn(details.join('\n'));
      }
    }
    if (!summary.success) {
      throw new Error('Version debt report failed');
    }
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(ReportDebt);
    const hookResult = await this.config.runHook('register-ecosystem', {});
    const ecosystems = hookResult.successes.map(
      (value) => value.result as EcosystemSupport<string>,
    );
    console.log(
      `Registered ecosystems: ${ecosystems.map((e) => e.name).join(', ')}`,
    );
    try {
      const reporter = new XeelReporter(flags, ecosystems);
      const debtSummary = await reporter.reportDependencyDebt();
      this.processSummary(debtSummary, flags.verbose);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
