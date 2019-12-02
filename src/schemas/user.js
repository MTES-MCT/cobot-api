export default `
  type User {
    id: ID!
    email: String
    password: String
    name: String
    role: Int
    token: String
    reminder: String
    bots: [Bot]
    lastConnection: String
    activity: UserActivity
    projects: [UserProjects]
    photos: Int
    labels: Int
  }

  type UserProjects {
    id: ID!
    name: String
    role: Int
    question: String
    answers: [Answer]
  }

  input UserProjectsInput {
    id: ID!
    role: Int
  }

  type UserActivity {
    lastAnswersAt: String
    numAnswers: Int
    slotNumAnswers: Int
    wakeUpLogs: WakeUpLogs
  }

  input UserActivityInput {
    lastAnswersAt: String
    numAnswers: Int
    slotNumAnswers: Int
    wakeUpLogs: WakeUpLogsInput
  }

  type UserAnswer {
    userId: ID!
    answers: String!
    createdAt: String
  }
`;
