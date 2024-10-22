import { gql } from 'graphql-request';
import { Dependency } from '../../../../ecosystems/index.js';
import { GraphQLAPI } from './index.js';

export class DebtAPI extends GraphQLAPI {
  async upsertDebt(id: string, dependencies: Dependency<string>[]) {
    const document = gql`
      mutation UpsertDebt($id: ID!, $dependencies: [InputDependency]!) {
        upsertDependencyDebt(projectId: $id, dependencies: $dependencies) {
          debtScore
        }
      }
    `;
    const response = await this.client.request<{
      upsertDependencyDebt: { debtScore: number };
    }>(document, { id, dependencies });
    const { debtScore } = response.upsertDependencyDebt;
    return debtScore;
  }
}
