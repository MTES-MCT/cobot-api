export default `
  
  directive @isAuthenticated on QUERY | FIELD
  directive @hasRole(role: Int) on QUERY | FIELD

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
    User(id: ID!): User
    Users(limit: Int): [User]
  }

  type Mutation {
    createUser(name: String!, email: String!, password: String!, role: Int, bots: BotInput): User!
    updateUser(id: ID!, name: String, email: String, password: String, role: Int, bots: BotInput): User!
    authorization(email: String!, password: String!): String!
  }

`;
