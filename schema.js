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

  type Message {
    id: ID!
    text: [MessageText]
    attachments: [Attachment]
  }

  type MessageText {
    text: String
    counter: Int
  }

  type Attachment {
    id: ID!
    text: [MessageText]
    color: String
    callback: String
    actions: [Action]
    order: Int
  }

  type User {
    id: ID!
    email: String
    password: String
    name: String
    role: Int
    bots: [Bot]
  }

  type Query {
    Me: User
    Message(name: String!): Message
    User(id: ID!): User
    Users(limit: Int): [User]
  }

  type Mutation {
    createUser(name: String, email: String, password: String!, role: Int!, bots: BotInput): User!
    updateUser(id: ID!, name: String, email: String, password: String, role: Int, bots: BotInput): User!
    authorization(email: String!, password: String!): String!
    loginByBot(channel: String!, channelUid: String!): User!
  }

`;
