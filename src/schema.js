export default `
  
  directive @isAuthenticated on QUERY | FIELD
  directive @hasRole(role: Int) on QUERY | FIELD

  type Action {
    id: ID!
    name: String
    text: String
    type: String
    order: Int
    value: String
  }

  input ActionInput {
    id: ID!
  }

  type Answer {
    text: String!
    order: Int!
  }

  input AnswerInput {
    text: String!
    order: Int!
  }

  type Attachment {
    id: ID!
    text: [MessageText]
    image: String
    color: String
    callback: String
    actions: [Action]
    order: Int
  }

  input AttachmentInput {
    id: ID!
    text: [MessageInput]
    callback: String
    color: String
    image: String
  }

  type Bot {
    id: ID!
    channel: String
    channelUid: String
    token: String
  }

  input BotInput {
    channel: String
    channelUid: String
    token: String
  }

  type GeoData {
    createdAt: String
    location: Location
    speed: Float
    altitude: Float
    accuracy: Int
  }

  type Location {
    coordinates: [Float]
  }

  type NewContribution {
    source: String
    createdAt: String
  }

  type ContributionStats {
    createdAt: String
    numAnswers: String
  }

  type DataSet {
    _id: ID!
    name: String!
    file: String
    question: String
    metadata: Metadata
    availableAnswers: [Answer]
    usersAnswers: [UserAnswer]
    numAnswers: Int
  }

  type Message {
    id: ID!
    name: String!
    text: [MessageText]
    attachments: [Attachment]
  }

  type MessageText {
    text: String
    counter: Int
  }

  input MessageInput {
    text: String
    counter: Int
  }

  type Metadata {
    id: String
    source: String
    geoData: GeoData
  }

  type Project {
    id: ID!
    name: String
    question: String
    owner: ID
    answers: [Answer]
  }

  type Statistics {
    datas: Int
    contributions: Int
    achievement: Int
    contributionsGraph: [ContributionStats]
  }

  type User {
    id: ID!
    email: String
    password: String
    name: String
    role: Int
    token: String
    reminder: String
    bots: [Bot]
    activity: UserActivity
    projects: [UserProjects]
  }
 
  type UserProjects {
    id: ID!
    role: Int
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

  type WakeUpLogs {
    at: String,
    channel: String,
  }

  input WakeUpLogsInput {
    at: String,
    channel: String
  }

  type Query {
    Actions: [Action]
    DataSet(source: String): DataSet
    DataSetBySource(source: String!): [DataSet]
    DataSetStats(source: String!): Statistics
    Me: User
    Messages: [Message]
    Message(name: String, id: ID): Message
    Project(id: ID!): Project
    User(id: ID!): User
    Users(limit: Int): [User]
    WakeUpUsers(lastAnswers: String): [User]
  }

  type Mutation {
    createUser(name: String, email: String, password: String!, role: Int!, bots: BotInput): User!
    updateUser(name: String, email: String, password: String, role: Int, bots: BotInput, activity: UserActivityInput, projects: [UserProjectsInput]): User!
    updateUserReminder(reminder: String!): User!
    updateUserActivity(id: ID!, activity: UserActivityInput!): User!
    updateUserProjects(id: ID!, projects: UserProjectsInput!): User!
    authorization(email: String!, password: String!): String!
    loginByBot(channel: String!, channelUid: String!): User!
    dataSetAnswers(id: ID!, answer: String!): User!
    updateMessage(id: ID!, message: [MessageInput], attachments: [AttachmentInput], actions: [ActionInput]): ID!
    deleteMessage(id: ID!): String
    createProject(name: String, question: String, answers: [AnswerInput]): Project!
    deleteProject(id: ID!): String
    updateProject(id: ID!, name: String, question: String, answers: [AnswerInput]): Project!
  }

  type Subscription {
    contributionAdded(source: String!): NewContribution
  }
`;
