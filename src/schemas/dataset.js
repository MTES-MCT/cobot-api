export default `
  type DataSet {
    _id: ID!
    name: String!
    file: String
    question: String
    metadata: Metadata
    availableAnswers: [Answer]
    usersAnswers: [UserAnswer]
    numAnswers: Int
  }

  type Metadata {
    id: String
    source: String
    geoData: GeoData
    raw: String
  }
`;
