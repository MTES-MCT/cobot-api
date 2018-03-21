import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import Promise from 'bluebird';
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
    Message: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      async () => {
        const message = await models.Messages
          .findOne({ name: args.name })
          .populate({
            path: 'attachments',
            populate: [{
              path: 'actions',
            }],
          });
        message.text = _.minBy(message.text, text => text.counter);

        await Promise.map(message.attachments, async (attachment) => {
          attachment.text = _.minBy(attachment.text, text => text.counter);
          // Update message.attachment.text counter
          await models.Attachments.findOneAndUpdate({
            _id: attachment.id,
            text: {
              $elemMatch: {
                text: attachment.text[0].text,
                counter: attachment.text[0].counter,
              },
            },
          }, {
            $inc: {
              'text.$.counter': 1,
            },
          });
        });

        // Update message.text counter
        await models.Messages.findOneAndUpdate({
          _id: message.id,
          text: {
            $elemMatch: {
              text: message.text[0].text,
              counter: message.text[0].counter,
            },
          },
        }, {
          $inc: {
            'text.$.counter': 1,
          },
        });

        return message;
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
