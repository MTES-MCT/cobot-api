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

  type Answer {
    text: String!
    order: Int!
  }

  type Attachment {
    id: ID!
    text: [MessageText]
    color: String
    callback: String
    actions: [Action]
    order: Int
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

  type DataSet {
    _id: ID!
    name: String!
    file: String
    question: String
    availableAnswers: [Answer]
    userAnswers: [UserAnswer]
  }

  type Message {
    id: ID!
    text: [MessageText]
    attachments: [Attachment]
  }

  type MessageText {
    text: String
    counter: Int
  }

  type User {
    id: ID!
    email: String
    password: String
    name: String
    role: Int
    token: String
    bots: [Bot]
    activity: UserActivity
  }

  type UserActivity {
    lastAnswersAt: String
    wakeUpLogs: WakeUpLogs
  }

  input UserActivityInput {
    lastAnswersAt: String
    wakeUpLogs: WakeUpLogsInput
  }

  type UserAnswer {
    userId: ID!
    answer: String!
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
    # Fecth one random data where user do not answer.
    DataSet: DataSet
    Me: User
    Message(name: String!): Message
    User(id: ID!): User
    Users(limit: Int): [User]
  }

  type Mutation {
    createUser(name: String, email: String, password: String!, role: Int!, bots: BotInput): User!
    updateUser(id: ID!, name: String, email: String, password: String, role: Int, bots: BotInput, activity: UserActivityInput): User!
    authorization(email: String!, password: String!): String!
    loginByBot(channel: String!, channelUid: String!): User!
    dataSetAnswers(id: ID!, answer: String!): DataSet!
  }
`;
