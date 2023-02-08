export default `
  type Query {
    Actions: [Action]
    AutoLogin(email: String!): User
    AutoMLExport(projectId: ID!, label: String): [DataSet]
    checkAutoMLFiles: String
    DataSet(projectId: ID!, id: ID, notAnswered: Boolean): DataSet
    DataSetBySource(id: ID!, user: ID, label: String, offset: Int, limit: Int, label: String): [DataSet]
    DataSetByRadius(geo: String, radius: Int, offset: Int, limit: Int): [DataSet]
    DataSetStats(id: ID!): Statistics
    DataSetNumLabel(projectId: ID!, label: String!): String
    CountDataSetBySource(projectId: ID!, user: ID, label: String): Int
    Me: User
    userPhotos: [DataSet]
    Messages: [Message]
    Message(name: String, id: ID): Message
    Project(id: ID!): Project
    ProjectContributors(projectId: ID!): [User]
    User(id: ID!): User
    Users(limit: Int): [User]
    WakeUpUsers(lastAnswers: String): [User]
    userRanking(id: ID!): [User]
    Labels: [Label]
    Contact(subject: String!, message: String!, email: String): Boolean
  }
`;
