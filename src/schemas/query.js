export default `
  type Query {
    Actions: [Action]
    AutoLogin(email: String!): User
    AutoMLExport(projectId: ID!, label: String): [DataSet]
    DataSet(projectId: ID!, id: ID, notAnswered: Boolean): DataSet
    DataSetBySource(id: ID!): [DataSet]
    DataSetStats(id: ID!): Statistics
    DataSetNumLabel(projectId: ID!, label: String!): String
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
