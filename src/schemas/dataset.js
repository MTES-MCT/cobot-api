export default `
  type DataSet {
    _id: ID!
    user: [User],
    user_doc: [User],
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
    originalWidth: Int
    originalHeight: Int
    originalOrientation: Int
    distance: Float
  }
`;
