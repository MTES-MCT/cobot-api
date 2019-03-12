export default `
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
`;
