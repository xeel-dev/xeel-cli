import { gql } from 'graphql-request';
import { Dependency } from '../../../../ecosystems/index.js';
import { GraphQLAPI } from './index.js';

export class DebtAPI extends GraphQLAPI {
  async upsertDebt(
    id: string,
    dependencies: Dependency<string>[],
    totalDependencies?: number,
  ) {
    const document = gql`
      mutation UpsertDebt(
        $id: ID!
        $dependencies: [InputDependency]!
        $totalDependencies: Int
      ) {
        upsertDependencyDebt(
          projectId: $id
          dependencies: $dependencies
          totalDependencies: $totalDependencies
        ) {
          debtScore
        }
      }
    `;
    const response = await this.client.request<{
      upsertDependencyDebt: { debtScore: number };
    }>(document, { id, dependencies, totalDependencies });
    const { debtScore } = response.upsertDependencyDebt;
    return debtScore;
  }
}
