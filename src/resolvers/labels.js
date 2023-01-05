import { checkRoleAndResolve, ADMIN } from './common';

export const Labels = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    const labels = await models.Labels.find().sort('text');
    return labels;
  },
);

export const createLabel = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    const label = {
      uid: args.uid,
      text: args.text,
      ttl: args.ttl,
      photo: args.photo,
      icon: args.icon,
      isObstacle: args.isObstacle,
    };
    try {
      const newLabel = await models.Labels.create(label);
      return newLabel;
    } catch (e) {
      return e;
    }
  },
);

export const updateLabel = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    const label = {
      uid: args.uid,
      text: args.text,
      ttl: args.ttl,
      photo: args.photo,
      icon: args.icon,
      isObstacle: args.isObstacle,
      properties: args.properties || [],
    };
    try {
      const updatedLabel = await models.Labels.findOneAndUpdate({ _id: models.toObjectId(args.id) }, label, { new: true });
      return updatedLabel;
    } catch (e) {
      return e;
    }
  },
);

export const labelDelete = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    try {
      await models.Labels.deleteOne({ _id: args.id });
      return 'true';
    } catch (e) {
      return e;
    }
  },
);
