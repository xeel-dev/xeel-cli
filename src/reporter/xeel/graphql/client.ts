import { GraphQLClient } from 'graphql-request';
import { AuthProvider } from '../auth-providers/index.js';
import { apiBaseUrl } from '../constants.js';

export class XeelGraphQLClientFactory {
  private client: InstanceType<typeof GraphQLClient> | undefined;
  constructor(private authProvider: AuthProvider) {}

  async getClient() {
    if (!this.client) {
      await this.authProvider
        .getHeaders()
        .then((headers) => {
          this.client = new GraphQLClient(apiBaseUrl + '/graphql', { headers });
        })
        .catch((error) => {
          console.error(error);
          throw new Error('Failed initializing Xeel GraphQL client');
        });
    }

    return this.client;
  }
}
