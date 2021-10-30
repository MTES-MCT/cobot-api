export default `
  type Label {
    _id: ID!
    uid: String!
    text: String!
    order: Int!
    img: String
    photo: String
    icon: String
    isObstacle: Boolean
    properties: [Properties]
  }
  
  type Properties {
    name: String
    val_1: String
    val_2: String
    val_3: String
  }

  input PropertiesInput {
    name: String
    val_1: String
    val_2: String
    val_3: String
  }

  input LabelInput {
    _id: ID,
    text: String!
    order: Int!
    properties: [PropertiesInput]
  }
`;
