export default `
  type Query {
    Actions: [Action]
    AutoLogin(email: String!): User
    DataSet(projectId: ID!, id: ID): DataSet
    DataSetBySource(id: ID!): [DataSet]
    DataSetStats(id: ID!): Statistics
    Me: User
    Messages: [Message]
    Message(name: String, id: ID): Message
    Project(id: ID!): Project
    ProjectContributors(id: ID!): [User]
    User(id: ID!): User
    Users(limit: Int): [User]
    WakeUpUsers(lastAnswers: String): [User]
  }
`;
