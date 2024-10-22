export abstract class GraphQLAPI {
  constructor(
    public readonly client: InstanceType<
      typeof import('graphql-request').GraphQLClient
    >,
  ) {}
}
