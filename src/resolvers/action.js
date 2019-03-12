import { checkRoleAndResolve, AUTH_SUPERADMIN } from './common';

export default async (parent, args, { models, req }) => {
  return checkRoleAndResolve(req, AUTH_SUPERADMIN, () => models.Actions.find());
};
