export default `
  type Mutation {
    createUser(name: String, email: String, password: String!, role: Int!, bots: BotInput): User!
    updateUser(name: String, email: String, password: String, role: Int, bots: BotInput, activity: UserActivityInput, projects: [UserProjectsInput]): User!
    updateUserPassword(id: ID!, password: String!): User!
    updateUserReminder(reminder: String!): User!
    updateUserActivity(id: ID!, activity: UserActivityInput!): User!
    updateUserProjects(id: ID!, projects: UserProjectsInput!): User!
    updateUserProjectsRole(email: String!, projects: UserProjectsInput!): User!
    authorization(email: String!, password: String!): String!
    loginByBot(channel: String!, channelUid: String!): User!
    dataSetAnswers(id: ID!, answer: String!): User!
    updateMessage(id: ID!, message: [MessageInput], attachments: [AttachmentInput], actions: [ActionInput]): ID!
    deleteMessage(id: ID!): String
    createProject(name: String, question: String, answers: [AnswerInput]): Project!
    deleteProject(id: ID!): String
    updateProject(id: ID!, name: String, question: String, answers: [AnswerInput]): Project!
    createProjectContributor(id: ID!, email: String, role: Int): User
    deleteProjectContributor(id: ID!, email: String): [User]
  }
`;
