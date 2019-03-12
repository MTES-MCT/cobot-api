export default `
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
`;
