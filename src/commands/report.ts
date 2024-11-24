import { Command, Flags } from '@oclif/core';
import { EcosystemSupport } from '../ecosystems/index.js';
import XeelReporter from '../reporter/xeel/index.js';

export default class ReportAll extends Command {
  static override description =
    'an opinionated report command, that runs all available reporters';

  static override examples = ['<%= config.bin %> <%= command.id %>'];

  static override flags = {
    auth: Flags.string({
      char: 'a',
      description: 'Authentication provider to use for Xeel API',
      options: ['github', 'xeel'],
      default: 'xeel',
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Print verbose output',
      default: process.env.DEBUG ? true : false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ReportAll);
    const hookResult = await this.config.runHook('register-ecosystem', {});
    const ecosystems = hookResult.successes.map(
      (value) => value.result as EcosystemSupport<string>,
    );
    console.log(
      `Registered ecosystems: ${ecosystems.map((e) => e.name).join(', ')}`,
    );
    try {
      const reporter = new XeelReporter(flags, ecosystems);
      await reporter.reportDependencyDebt();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
