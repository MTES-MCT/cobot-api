import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { checkAuthAndResolve, checkRoleAndResolve } from './policies';

const pubsub = new PubSub();
const CONTRIBUTION_ADDED = 'newContribution';

const AUTH_SUPERADMIN = 100;

export default {
  Query: {
    Actions: async (parent, args, { models, req }) => checkRoleAndResolve(
      req,
      AUTH_SUPERADMIN,
      () => models.Actions.find(),
    ),
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
    DataSetBySource: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      async () => {
        const data = await models.DataSet.aggregate([
          {
            $match: {
              'metadata.source': args.source,
            },
          },
          {
            $project: {
              _id: 1,
              file: 1,
              usersAnswers: 1,
              numAnswers: {
                $size: {
                  $ifNull: ['$usersAnswers', []],
                },
              },
            },
          },
          {
            $sort: {
              numAnswers: -1,
            },
          },
        ]).limit(100);
        return data;
      },
    ),
    DataSetStats: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      async () => {
        const output = {
          datas: 0,
          contributionTotal: 0,
          achievement: 0,
          contributionsGraph: [],
        };
        const data = await models.DataSet.aggregate([
          {
            $match: {
              'metadata.source': args.source,
            },
          },
        ]);

        const contributions = _.flatMap(data, 'usersAnswers');
        const contributionsGroup = _.groupBy(contributions, contribution => moment(contribution.createdAt).format('YYYY-MM-DD'));
        const contributionsGraph = [];
        const datasWithoutContribution = _.filter(data, d => d.usersAnswers.length === 0);

        const orderedContributionsGroup = {};
        _(contributionsGroup).keys().sort().each((key) => {
          orderedContributionsGroup[key] = contributionsGroup[key];
        });

        _.each(orderedContributionsGroup, (contribution, index) => {
          contributionsGraph.push({
            createdAt: index,
            numAnswers: contribution.length,
          });
        });

        output.datas = data.length;
        output.contributions = contributions.length;
        output.achievement = 100 - Math.ceil((datasWithoutContribution.length * 100) / output.datas);
        output.contributionsGraph = contributionsGraph;
        return output;
      },
    ),
    Me: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      async (token) => {
        const user = await models.Users.findById(token.id);
        return user;
      },
    ),
    Messages: async (parent, args, { models, req }) => checkRoleAndResolve(
      req,
      AUTH_SUPERADMIN,
      () => models.Messages
        .find()
        .populate({
          path: 'attachments',
          populate: [{
            path: 'actions',
          }],
        }),
    ),
    Message: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      async () => {
        const criteria = (args.name) ? { name: args.name } : { _id: args.id };
        const message = await models.Messages
          .findOne(criteria)
          .populate({
            path: 'attachments',
            populate: [{
              path: 'actions',
            }],
          });

        if (criteria.name) {
          message.text = _.minBy(message.text, text => text.counter);
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
        }

        if (criteria.name) {
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
        }

        return message;
      },
    ),
    User: (parent, args, { models, req }) => checkAuthAndResolve(
      req,
      () => models.Users.findById(args.id),
    ),
    Users: (parent, args, { models, req }) => checkRoleAndResolve(
      req,
      AUTH_SUPERADMIN,
      () => models.Users.find(),
    ),
    WakeUpUsers: async (parent, args, { models, req }) => {
      const users = await checkRoleAndResolve(
        req,
        AUTH_SUPERADMIN,
        () => models.Users.find({
          $and: [
            {
              $or: [
                {
                  reminder: {
                    $lte: new Date(),
                  },
                },
                {
                  reminder: null,
                },
              ],
            },
            {
              $or: [
                {
                  'activity.lastAnswersAt': {
                    $lte: new Date(args.lastAnswers),
                  },
                },
                {
                  'activity.lastAnswersAt': null,
                },
              ],
            },
          ],
        }),
      );
      return users;
    },
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
        }, user, { new: true, upsert: true });
        if (bot) {
          await models.Users.findByIdAndUpdate(newUser._id, {
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
      delete user.id;
      let bot;
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      if (user.bots) {
        bot = user.bots;
        delete user.bots;
      }

      const updateUser = await checkAuthAndResolve(req, userJwt =>
        models.Users.findByIdAndUpdate(userJwt.id, user));

      if (bot) {
        await checkAuthAndResolve(req, userJwt =>
          models.Users.findByIdAndUpdate(userJwt.id, {
            $push: {
              bots: bot,
            },
          }));
      }

      return updateUser;
    },

    updateUserActivity: async (parent, args, { models, req }) => {
      const users = await checkRoleAndResolve(
        req,
        AUTH_SUPERADMIN,
        () => models.Users.findByIdAndUpdate(args.id, {
          activity: args.activity,
        }, {
          new: true,
        }),
      );
      return users;
    },

    updateUserReminder: async (parent, args, { models, req }) => {
      const users = await checkAuthAndResolve(
        req,
        user => models.Users.findByIdAndUpdate(user.id, {
          reminder: args.reminder,
        }, {
          new: true,
        }),
      );
      return users;
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

    dataSetAnswers: async (parent, args, { models, req }) => {
      let User;
      await checkAuthAndResolve(req, async (user) => {
        User = user;
        const answer = await models.DataSet.findByIdAndUpdate(args.id, {
          $push: {
            usersAnswers: {
              userId: user.id,
              answers: args.answer,
              createdAt: new Date(),
            },
          },
        }, { new: true });
        pubsub.publish(
          CONTRIBUTION_ADDED,
          {
            contributionAdded:
              {
                source: answer.metadata.source,
                createdAt: new Date(),
              },
          },
        );
      });

      const updatedUser = await models.Users.findByIdAndUpdate(User.id, {
        'activity.lastAnswersAt': new Date(),
        $inc: {
          'activity.numAnswers': 1,
        },
      }, {
        new: true,
      });

      return updatedUser;
    },

    updateMessage: (parent, args, { models, req }) => checkRoleAndResolve(
      req,
      AUTH_SUPERADMIN,
      async () => {
        // Delete Old Main Message
        await models.Messages.findOneAndUpdate({
          _id: args.id,
        }, {
          $unset: {
            text: '',
          },
        });

        // Add New Main Message
        await models.Messages.findOneAndUpdate({
          _id: args.id,
        }, {
          $push: {
            text: args.message,
          },
        });

        // update Attachement
        await models.Attachments.findOneAndUpdate({
          _id: args.attachments[0].id,
        }, {
          $unset: {
            text: '',
          },
        });

        await models.Attachments.findOneAndUpdate({
          _id: args.attachments[0].id,
        }, {
          $push: {
            text: args.attachments[0].text,
          },
          $set: {
            image: args.attachments[0].image,
            callback: args.attachments[0].callback,
          },
        });

        await models.Attachments.findOneAndUpdate({
          _id: args.attachments[0].id,
        }, {
          $unset: {
            actions: '',
          },
        });

        await Promise.map(args.actions, async (action) => {
          await models.Attachments.findOneAndUpdate({
            _id: args.attachments[0].id,
          }, {
            $push: {
              actions: action.id,
            },
          });
        });

        return args.id;
      },
    ),
    deleteMessage: (parent, args, { models, req }) => checkRoleAndResolve(
      req,
      AUTH_SUPERADMIN,
      () => models.Messages.remove({ _id: args.id }),
    ),
  },
  Subscription: {
    contributionAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(CONTRIBUTION_ADDED),
        (payload, variables) => payload.contributionAdded.source === variables.source,
      ),
    },
  },
};
