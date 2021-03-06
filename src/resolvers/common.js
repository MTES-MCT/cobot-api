import { PubSub, withFilter } from 'graphql-subscriptions';
import { checkAuthAndResolve, checkRoleAndResolve } from '../policies';

const pubsub = new PubSub();
const CONTRIBUTION_ADDED = 'newContribution';
const UPLOAD_PROGRESS = 'progress';

const AUTH_SUPERADMIN = 100;
const ADMIN = 80;

export {
  checkAuthAndResolve,
  checkRoleAndResolve,
  pubsub,
  withFilter,
  CONTRIBUTION_ADDED,
  UPLOAD_PROGRESS,
  AUTH_SUPERADMIN,
  ADMIN,
};
