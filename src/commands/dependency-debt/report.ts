import { Command, Flags } from '@oclif/core';
import { EcosystemSupport } from '../../ecosystems/index.js';
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
  };

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
      await reporter.reportDependencyDebt();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
