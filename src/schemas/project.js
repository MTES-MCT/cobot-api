export default `
  type Project {
    id: ID!
    name: String
    details: String
    question: String
    owner: ID
    answers: [Answer]
    labels: [Label]
  }

  input ProjectInput {
    id: ID!
    name: String
    details: String
    question: String
    owner: ID
    role: Int
    answers: [AnswerInput]
    labels: [LabelInput]
  }
`;
