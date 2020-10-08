/* eslint-disable no-underscore-dangle */
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import Promise from 'bluebird';
import moment from 'moment';
import eachSeries from 'async/eachSeries';
import { Storage } from '@google-cloud/storage';
import { checkRoleAndResolve, checkAuthAndResolve, pubsub, withFilter, UPLOAD_PROGRESS, ADMIN, CONTRIBUTION_ADDED } from './common';

const rawFieldToString = (row) => {
  row.metadata.raw = (row.metadata.raw) ? JSON.stringify(row.metadata.raw) : null;
  return row;
};

const pusblishProgress = (data, uid) => {
  pubsub.publish(
    UPLOAD_PROGRESS,
    {
      uploadProgress:
      {
        data,
        id: uid,
      },
    },
  );
};

export const uploadProgress = {
  subscribe: withFilter(
    () => pubsub.asyncIterator(UPLOAD_PROGRESS),
    (payload, variables) => payload.uploadProgress.id.toString() === variables.uid.toString(),
  ),
};

const storage = new Storage();
const bucket = storage.bucket('ia-garbage-build');

export const DataSet = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (user) => {
    let criteria = {};
    if (args.notAnswered) {
      criteria = {
        'usersAnswers.userId': {
          $ne: models.toObjectId(user.id),
        },
      };
    }
    if (args.projectId) {
      criteria['metadata.id'] = models.toObjectId(args.projectId);
    }
    if (args.id) {
      criteria._id = models.toObjectId(args.id);
    }
    const datas = await models.DataSet.aggregate()
      .match(criteria)
      .sample(100);
    let data = _.find(datas, (d) => {
      // const uploadPath = (process.env.NODE_ENV === 'development') ?
      //  '../../uploads' : '../uploads';
      const uploadPath = '../../uploads';
      const filer = path.join(__dirname, uploadPath);
      if (fs.existsSync(`${filer}/${args.projectId}/${d.file}`)) {
        return d;
      }
    });
    data = rawFieldToString(data);
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
    ]).limit(2000);

    const dataset = _.map(data, rawFieldToString);
    return dataset;
  },
);

export const DataSetNumLabel = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    const datas = await models.DataSet.find({
      $text: { $search: args.label },
      'metadata.id': models.toObjectId(args.projectId),
    });
    let autoMLExported = 0;
    return new Promise(async (resolve, reject) => {
      await Promise.map(datas, async (data) => {
        // if (['chantier', 'garbage', 'stairs'].indexOf(args.label) === -1) {
        //   await models.DataSet.findOneAndUpdate({ _id: data._id }, { 'metadata.autoMLExported': false });
        // }
        if (data.metadata.autoMLExported === true) {
          autoMLExported += 1;
        }
      });
      resolve(`${datas.length} - exporté ${autoMLExported}`);
    });
    // let dataset = 0;
    // await Promise.map(datas, async (data) => {
    //   // await models.DataSet.findOneAndUpdate({ _id: data._id }, { 'metadata.autoMLExported': false });
    //   await Promise.map(data.usersAnswers, async (answer) => {
    //     if (answer.answers.indexOf(args.label) > -1) {
    //       dataset += 1;
    //     }
    //   });
    // });
    // return dataset;
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

export const dataDelete = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    await models.DataSet.remove({ _id: args.id });
  },
);

export const AutoMLExport = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (user) => {
    pusblishProgress(`fetching ${args.label} files...`, user.id);
    const criteria = {
      'metadata.id': models.toObjectId(args.projectId),
      'metadata.autoMLExported': false,
      $text: { $search: args.label },
      'usersAnswers.0': { $exists: true },
    };
    const uploadPath = '../../uploads';
    const filer = path.join(__dirname, uploadPath);
    // const datas = await models.DataSet.find(criteria);

    const datas = await models.DataSet.aggregate()
      .match(criteria);

    const dataset = _.map(datas, rawFieldToString);

    try {
      const file = bucket.file('googleVisionFilename.csv');
      await file.download({
        destination: '/tmp/googleVisionFilename.csv',
      });
    } catch (e) {
      console.log(e);
    }
    return new Promise(async (resolve, reject) => {
      const csv = [];
      const selectedDatas = [];
      let num = 1;
      eachSeries(dataset, async (data, cb) => {
        if (fs.existsSync(`${filer}/${args.projectId}/${data.file}`)) {
          const file = bucket.file(data.file);
          const isFileExistsOnGC = await file.exists();
          console.log('file', data.file, isFileExistsOnGC[0]);
          if (isFileExistsOnGC && !isFileExistsOnGC[0]) {
            console.log('file does\'nt exists on GC');
            const width = (data.metadata.raw.ImageWidth) ? data.metadata.raw.ImageWidth : 400;
            const height = (data.metadata.raw.ImageHeight) ? data.metadata.raw.ImageHeight : 300;
            try {
              await bucket.upload(`${filer}/${args.projectId}/${data.file}`);
              await models.DataSet.findOneAndUpdate({ _id: data._id }, { 'metadata.autoMLExported': true });
              pusblishProgress(`upload file ${num}/~${dataset.length}`, user.id);
              num += 1;
              eachSeries(data.usersAnswers, async (answer, cbAnswer) => {
                const label = JSON.parse(answer.answers);
                if (label.label.id === args.label) {
                  try {
                    selectedDatas.push(data);
                    const xmin = ((label.voc.xmin * 100) / width) / 100;
                    const ymin = ((label.voc.yminVoc * 100) / height) / 100;
                    const xmax = ((label.voc.xmax * 100) / width) / 100;
                    const ymax = ((label.voc.ymaxVoc * 100) / height) / 100;
                    csv.push(`,gs://ia-garbage-build/${data.file},${label.label.id},${xmin},${ymin},,,${xmax},${ymax},,`);
                    cbAnswer();
                  } catch (e) {
                    console.log(e);
                    cbAnswer();
                  }
                } else {
                  cbAnswer();
                }
              }, () => {
                cb();
              });
            } catch (e) {
              console.log(e);
              cb();
            }
          } else {
            console.log('file exists on GC');
            cb();
          }
        } else {
          console.log('file does\'nt exists on this server');
          cb();
        }
      }, async () => {
        await bucket.upload('/tmp/googleVisionFilename.csv', { destination: `/csv/googleVisionFilename_${moment().format('YYYY_MM_DD_HH_mm_ss')}.csv` });
        fs.appendFileSync('/tmp/googleVisionFilename.csv', csv.join('\n'), 'binary');
        await bucket.upload('/tmp/googleVisionFilename.csv');
        pusblishProgress('upload done !', user.id);
        console.log('done');
        resolve(selectedDatas);
      });
    });
  },
);
