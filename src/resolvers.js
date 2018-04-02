import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import Promise from 'bluebird';
import { checkAuthAndResolve, checkRoleAndResolve } from './policies';

export default {
  Query: {
    DataSet: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      async (user) => {
        const data = await models.DataSet.aggregate()
          .match({
            'usersAnswers.userId': {
              $ne: models.toObjectId(user.id),
            },
          })
          .sample(1);
        const orderedAvailableAnswers = _.sortBy(data[0].availableAnswers, ['order']);
        data[0].availableAnswers = orderedAvailableAnswers;
        return data[0];
      },
    ),
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
    createUser: async (parent, args, { models }) => {
      const user = args;
      let bot;
      if (user.bots) {
        bot = user.bots;
        delete user.bots;
      }
      user.password = await bcrypt.hash(user.password, 12);
      try {
        const newUser = await models.Users.findOneAndUpdate({
          email: user.email,
        }, user, { upsert: true });
        if (bot) {
          await models.Users.findByIdAndUpdate(newUser.id, {
            $push: {
              bots: bot,
            },
          });
        }
        return newUser;
      } catch (error) {
        return error;
      }
    },

    updateUser: async (parent, args, { models, req }) => {
      const user = args;
      const { id } = user;
      delete user.id;
      let bot;
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      if (user.bots) {
        bot = user.bots;
        delete user.bots;
      }

      const updateUser = await checkAuthAndResolve(req, () =>
        models.Users.findByIdAndUpdate(id, user));

      if (bot) {
        await checkAuthAndResolve(req, () =>
          models.Users.findByIdAndUpdate(id, {
            $push: {
              bots: bot,
            },
          }));
      }
      return updateUser;
    },

    authorization: async (parent, { email, password }, { models }) => {
      const user = await models.Users.findOne({ email });
      if (!user) {
        throw new Error('No user with that email');
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

    loginByBot: async (parent, args, { models }) => {
      const user = await models.Users.findOne({
        'bots.channel': args.channel,
        'bots.channelUid': args.channelUid,
      });
      if (!user) {
        throw new Error('Can\'t find user on channel %s with uid %s', args.channel, args.channelUid);
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
      user.token = token;
      return user;
    },

    dataSetAnswers: async (parent, args, { models, req }) =>
      checkAuthAndResolve(req, user =>
        models.DataSet.findByIdAndUpdate(args.id, {
          $push: {
            usersAnswers: {
              userId: user.id,
              answers: args.answer,
              createdAt: new Date(),
            },
          },
        })),
  },
};
