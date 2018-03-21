import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { checkAuthAndResolve, checkRoleAndResolve } from './policies';

export default {
  Query: {
    Me: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      async (token) => {
        const user = await models.Users.findById(token.id);
        return user;
      },
    ),
    User: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      () => models.Users.findById(args.id),
    ),
    Users: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      () => models.Users.find(),
    ),
  },
  Mutation: {
    createUser: async (parent, args, { models, req }) => {
      const user = args;
      user.password = await bcrypt.hash(user.password, 12);
      return checkRoleAndResolve(req, 80, () => models.Users.create(user));
    },

    updateUser: async (parent, args, { models, req }) => {
      const user = args;
      let bot;
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      if (user.bots) {
        bot = user.bots;
        delete user.bots;
      }
      return checkAuthAndResolve(req, () => 
        models.Users.findByIdAndUpdate(user.id, user, () => {
          if (bot) {
            return models.Users.findByIdAndUpdate(user.id, {
              $push: {
                bots: bot,
              },
            }, { new: true }, () => {
              return user.id;
            });
          }
        }));
    },

    authorization: async (parent, { email, password }, { models }) => {
      const user = await models.Users.findOne({ email });
      if (!user) {
        throw new Error('Not user with that email');
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error('Incorrect password');
      }
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '1d',
        },
      );
      return token;
    },
  },
};
