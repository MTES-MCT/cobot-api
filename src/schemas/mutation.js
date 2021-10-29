export default `
  type Mutation {
    createUser(name: String, email: String, password: String!, role: Int!, bots: BotInput): User!
    updateUser(name: String, email: String, password: String, birthday: String, photo: String, city: String, role: Int, bots: BotInput, activity: UserActivityInput, projects: [UserProjectsInput]): User!
    updateUserPoint(point: PointInput): User!
    updateUserPassword(id: ID!, password: String!): User!
    updateUserReminder(reminder: String!): User!
    updateUserActivity(id: ID!, activity: UserActivityInput!): User!
    updateUserProjects(id: ID!, projects: UserProjectsInput!): User!
    updateUserProjectsRole(email: String!, projects: UserProjectsInput!): User!
    authorization(email: String!, password: String!): String!
    loginByBot(channel: String!, channelUid: String!): User!
    dataSetAnswers(id: ID!, answer: String!): User!
    dataDelete(id: ID!): String
    updateMessage(id: ID!, message: [MessageInput], attachments: [AttachmentInput], actions: [ActionInput]): ID!
    deleteMessage(id: ID!): String
    createProject(name: String, details: String, question: String, answers: [AnswerInput]): Project!
    deleteProject(id: ID!): String
    updateProject(id: ID!, name: String, question: String, answers: [AnswerInput], labels: [LabelInput]): Project!
    createProjectContributor(id: ID!, email: String, role: Int): User
    deleteProjectContributor(id: ID!, email: String): [User]
    dropbox(url: String, project: ProjectInput): String
    createLabel(uid: String!, text: String!, photo: String, icon: String, isObstacle: Boolean): Label
    updateLabel(id: ID!, uid: String!, text: String!, photo: String, icon: String, isObstacle: Boolean): Label
    labelDelete(id: ID!): String
  }
`;
