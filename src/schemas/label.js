export default `
  type Label {
    _id: ID!
    text: String!
    order: Int!
    img: String
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
    text: String!
    order: Int!
    img: String
    properties: [PropertiesInput]
  }
`;
