export default `
  type Project {
    id: ID!
    name: String
    question: String
    owner: ID
    answers: [Answer]
  }

  input ProjectInput {
    id: ID!
    name: String
    question: String
    owner: ID
    role: Int
    answers: [AnswerInput]
  }
`;
