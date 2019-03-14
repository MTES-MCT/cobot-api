export default `
  type Answer {
    _id: ID
    text: String!
    order: Int!
  }

  input AnswerInput {
    text: String!
    order: Int!
  }
`;
