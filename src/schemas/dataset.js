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
    class: String
    isObstacle: String
    status: [Status]
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
  
  type Status {
    userId: ID!
    status: Int
    updatedAt: String
    user: User
  }
`;
