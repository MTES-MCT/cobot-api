/* eslint-disable no-underscore-dangle */
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { checkAuthAndResolve, pubsub, CONTRIBUTION_ADDED } from './common';

export const DataSet = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (user) => {
    const criteria = {
      'usersAnswers.userId': {
        $ne: models.toObjectId(user.id),
      },
    };
    if (args.projectId) {
      criteria['metadata.id'] = models.toObjectId(args.projectId);
    }
    if (args.id) {
      criteria._id = models.toObjectId(args.id);
    }
    const datas = await models.DataSet.aggregate()
      .match(criteria)
      .sample(100);

    const data = _.find(datas, (d) => {
      const filer = path.join(__dirname, '../uploads');
      if (fs.existsSync(`${filer}/${args.projectId}/${d.file}`)) {
        return d;
      }
    });

    const orderedAvailableAnswers = _.sortBy(data.availableAnswers, ['order']);
    data.availableAnswers = orderedAvailableAnswers;
    return data;
  },
);

export const DataSetBySource = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    const data = await models.DataSet.aggregate([
      {
        $match: {
          'metadata.id': models.toObjectId(args.id),
        },
      },
      {
        $project: {
          _id: 1,
          file: 1,
          usersAnswers: 1,
          metadata: 1,
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
);

export const DataSetStats = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    const output = {
      datas: 0,
      contributors: 0,
      contributionTotal: 0,
      achievement: 0,
      contributionsGraph: [],
    };

    const contributors = await models.Users.aggregate([
      {
        $match: {
          'projects.id': models.toObjectId(args.id),
        },
      },
    ]);

    const data = await models.DataSet.aggregate([
      {
        $match: {
          'metadata.id': models.toObjectId(args.id),
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
    output.contributors = contributors.length;
    output.contributions = contributions.length;
    output.achievement = 100 - Math.ceil((datasWithoutContribution.length * 100) / output.datas);
    output.contributionsGraph = contributionsGraph;
    return output;
  },
);

export const dataSetAnswers = async (parent, args, { models, req }) => {
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
          id: answer.metadata.id,
          createdAt: new Date(),
        },
      },
    );
  });

  const updatedUser = await models.Users.findByIdAndUpdate(User.id, {
    'activity.lastAnswersAt': new Date(),
    $inc: {
      'activity.numAnswers': 1,
      'activity.slotNumAnswers': 1,
    },
  }, {
    new: true,
  });

  return updatedUser;
};
