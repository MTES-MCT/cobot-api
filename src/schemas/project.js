export default `
  type Project {
    id: ID!
    name: String
    question: String
    owner: ID
    answers: [Answer]
  }
`;
