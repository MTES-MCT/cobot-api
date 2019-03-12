export default `
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
`;
