import { gql } from 'graphql-request';
import { GraphQLAPI } from './index.js';

export class ProjectAPI extends GraphQLAPI {
  async upsertProjectByRepository(
    id: string,
    name: string,
    description?: string,
  ) {
    const upsertByRepoDocument = gql`
      mutation UpsertProject($id: ID!, $name: String!, $description: String) {
        upsertProjectByRepository(
          repositoryId: $id
          name: $name
          description: $description
        ) {
          id
        }
      }
    `;
    const project: { upsertProjectByRepository: { id: string } } =
      await this.client.request(upsertByRepoDocument, {
        id,
        name,
        description: description ?? '',
      });

    return project.upsertProjectByRepository.id;
  }

  async upsertProjectByParentProjectId(
    id: string,
    name: string,
    description?: string,
  ) {
    const upsertByParentDocument = gql`
      mutation UpsertProject($id: ID!, $name: String!, $description: String) {
        upsertSubProjectByParentProjectId(
          parentProjectId: $id
          name: $name
          description: $description
        ) {
          id
        }
      }
    `;
    const project: { upsertSubProjectByParentProjectId: { id: string } } =
      await this.client.request(upsertByParentDocument, {
        id,
        name,
        description: description ?? '',
      });
    return project.upsertSubProjectByParentProjectId.id;
  }
}
