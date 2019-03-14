export default `
  type Subscription {
    contributionAdded(id: ID!): NewContribution
    uploadProgress(uid: ID!): Progress
  }
`;
