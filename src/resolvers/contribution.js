import { CONTRIBUTION_ADDED, pubsub, withFilter } from './common';

export default {
  subscribe: withFilter(
    () => pubsub.asyncIterator(CONTRIBUTION_ADDED),
    (payload, variables) => payload.contributionAdded.id.toString() === variables.id.toString(),
  ),
};
