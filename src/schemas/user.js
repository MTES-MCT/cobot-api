export default `
  type User {
    _id: ID!
    email: String
    password: String
    name: String
    birthday: String,
    photo: String,
    city: String,
    point: [Point]
    role: Int
    token: String
    reminder: String
    bots: [Bot]
    lastConnection: String
    activity: UserActivity
    projects: [UserProjects]
    photos: Int
    labels: Int
    project: UserProjects
  }

  type Point {
    num: Int
    createdAt: String
    object: String
  }

  input PointInput {
    num: Int
    createdAt: String
    object: String
  }

  type UserProjects {
    id: ID!
    name: String
    role: Int
    isPro: Boolean
    question: String
    answers: [Answer]
    labels: [Label]
  }

  input UserProjectsInput {
    id: ID!
    role: Int
    isPro: Boolean
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
