export default `
  type Query {
    Actions: [Action]
    AutoLogin(email: String!): User
    AutoMLExport(projectId: ID!, label: String): [DataSet]
    checkAutoMLFiles: String
    DataSet(projectId: ID!, id: ID, notAnswered: Boolean): DataSet
    DataSetBySource(id: ID!, offset: Int, limit: Int, label: String): [DataSet]
    DataSetStats(id: ID!): Statistics
    DataSetNumLabel(projectId: ID!, label: String!): String
    CountDataSetBySource(projectId: ID!): Int
    Me: User
    userPhotos: [DataSet]
    Messages: [Message]
    Message(name: String, id: ID): Message
    Project(id: ID!): Project
    ProjectContributors(id: ID!): [User]
    User(id: ID!): User
    Users(limit: Int): [User]
    WakeUpUsers(lastAnswers: String): [User]
    userRanking(id: ID!): [User]
  }
`;
