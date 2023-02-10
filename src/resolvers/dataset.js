/* eslint-disable no-underscore-dangle */
import fs, { copyFileSync } from 'fs';
import csv from 'csv-parser';
import path from 'path';
import _ from 'lodash';
import Promise from 'bluebird';
import moment from 'moment';
import eachSeries from 'async/eachSeries';
import { Storage } from '@google-cloud/storage';
import { AutoMlClient } from '@google-cloud/automl';
import gm from 'gm';

import { checkAuthAndResolve, pubsub, withFilter, UPLOAD_PROGRESS, ADMIN, CONTRIBUTION_ADDED } from './common';

const projectId = '244101471703';
const location = 'us-central1';
const datasetId = 'IOD5099573412532060160';

const client = new AutoMlClient();

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

const checkBoundingBox = (coords) => {
  const outOfBox = _.find(coords, coord => coord < 0 || coord > 1);
  if (outOfBox) {
    return false;
  }
  return true;
};

const getOperationStatus = async (models, operation) => {
  const request = {
    name: operation,
  };
  const [response] = await client.operationsClient.getOperation(request);
  try {
    await models.Projects.updateOne(
      {
        'iaModels.operation': operation,
      },
      {
        $set: {
          'iaModels.$.status': (response.done) ? 'done' : 'progress',
          'iaModels.$.updatedAt': moment().format('YYYY-MM-DD HH:mm:ss'),
        },
      },
    );
  } catch (e) {
    console.log(e);
  }
};

const updateDataSet = async (models, localProjectId, uid) => {
  const path = 'gs://ia-garbage-build/googleVisionFilename.csv';
  const request = {
    name: client.datasetPath(projectId, location, datasetId),
    inputConfig: {
      gcsSource: {
        inputUris: path.split(','),
      },
    },
  };
  console.log('Proccessing import');
  try {
    const [operation] = await client.importData(request);
    console.log(operation.name);
    setTimeout(async () => {
      pusblishProgress('Update dataset...', uid);
      await models.Projects.findByIdAndUpdate({ _id: models.toObjectId(localProjectId) }, {
        $push: {
          iaModels: {
            operation: operation.name,
            status: 'progress',
          },
        },
      });
    }, 1000);
  } catch (e) {
    pusblishProgress('Error when processiong dataset...', uid);
    console.log(e);
  }
};

const getImageSize = (data, filer) => new Promise((resolve) => {
  if (data.metadata.raw && data.metadata.raw.ImageWidth) {
    return resolve({
      width: data.metadata.raw.ImageWidth,
      height: data.metadata.raw.ImageHeight,
    });
  }
  const gmImageMagick = gm.subClass({ imageMagick: true });
  gmImageMagick(`${filer}/${data.file}`)
    .size((err, size) => {
      if (!err) {
        return resolve({
          width: size.width,
          height: size.height,
        });
      }
    });
});

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
    console.log('*** DataSet ***');
    let criteria = {
    };
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
    criteria.isExpired = { $ne: true };
    console.log('\t criteria', criteria);
    const datas = await models.DataSet.aggregate()
      .match(criteria)
      .lookup({
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user_doc',
      })
      .sample(100);
    let data = _.find(datas, (d) => {
      const uploadPath = '../../uploads';
      const filer = path.join(__dirname, uploadPath);
      if (fs.existsSync(`${filer}/${args.projectId}/${d.file}`)) {
        return d;
      }
    });
    if (data) {
      data = rawFieldToString(data);
      const orderedAvailableAnswers = _.sortBy(data.availableAnswers, ['order']);
      data.availableAnswers = orderedAvailableAnswers;
      return data;
    }
    return null;
  },
);

export const DataSetBySource = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    const criteria = {
      'metadata.id': models.toObjectId(args.id),
    };
    if (args.user) {
      criteria.user = models.toObjectId(args.user);
    }
    if (args.label) {
      criteria.usersAnswers = {
        $elemMatch: {
          answers: {
            $regex: args.label,
          },
        },
      };
    }
    const data = await models.DataSet.aggregate([
      {
        $match: criteria,
      },
      {
        $project: {
          _id: 1,
          file: 1,
          usersAnswers: 1,
          metadata: 1,
          user: 1,
          numAnswers: {
            $size: {
              $ifNull: ['$usersAnswers', []],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user_doc',
        },
      },
      {
        $sort: {
          numAnswers: -1,
        },
      },
    ])
      .skip(args.offset)
      .limit(args.limit);
    const dataset = _.map(data, rawFieldToString);
    return dataset;
  },
);

export const DataSetByRadius = async (parent, args, { models }) => {
  console.log('*** DataSetByRadius ***');
  let coords = (args.geo) ? args.geo : '48.8420791 2.3794422';
  coords = coords.split(' ');
  console.log('\t coords :', coords);
  const data = await models.DataSet.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [parseFloat(coords[0], 10), parseFloat(coords[1], 10)] },
        distanceField: 'metadata.distance',
        maxDistance: args.radius,
        spherical: true,
      },
    },
    {
      $match: {
        isExpired: {
          $ne: true,
        },
      },
    },
    {
      $project: {
        _id: 1,
        file: 1,
        class: 1,
        isObstacle: 1,
        usersAnswers: 1,
        metadata: 1,
        user: 1,
        status: 1,
        numAnswers: {
          $size: {
            $ifNull: ['$usersAnswers', []],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user_doc',
      },
    },
    {
      $sort: {
        'metadata.geoData.createdAt': -1,
      },
    },
  ])
    .skip(args.offset)
    .limit(args.limit);
  await new Promise(async (resolve) => {
    await Promise.map(data, async (d) => {
      if (d.status) {
        await Promise.map(d.status, async (status) => {
          const user = await models.Users.findOne({ _id: status.userId });
          status.user = user.pseudo || user.name;
        });
      }
    });
    resolve();
  });
  const dataset = _.map(data, rawFieldToString);
  console.log('\t dataset length :', dataset.length);
  return dataset;
};

export const updateDatasetStatus = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (user) => {
    const status = await models.DataSet.findByIdAndUpdate(args.id, {
      $push: {
        status: {
          userId: user.id,
          status: args.status,
          updatedAt: new Date(),
        },
      },
    }, { new: true });
    return status;
  },
);

export const DataSetNumLabel = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    // getOperationStatus(models, 'projects/244101471703/locations/us-central1/operations/IOD1512740533087240192');
    // return 'ok';
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

export const dataDelete = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    // const dataset = await models.DataSet.findOne({ _id: args.id });
    // await models.Users.findOneAndUpdate({ _id: dataset.user }, {
    //   $pop: {
    //     point: -1,
    //   },
    // });
    await models.DataSet.deleteOne({ _id: args.id });
  },
);

const setAutoMLCsvRow = async (data, label, filer) => {
  const size = await getImageSize(data, filer);

  const xmin = ((label.voc.xmin * 100) / size.width) / 100;
  const ymin = ((label.voc.yminVoc * 100) / size.height) / 100;
  const xmax = ((label.voc.xmax * 100) / size.width) / 100;
  const ymax = ((label.voc.ymaxVoc * 100) / size.height) / 100;

  if (checkBoundingBox([xmin, ymin, xmax, ymax])) {
    const labelName = (label.label._id === '62276c3c73a7332a00405da5') ? 'yego' : label.label.id;
    return {
      csv: `,gs://ia-garbage-build/${data.file},${labelName},${xmin},${ymin},,,${xmax},${ymax},,`,
      data,
    };
  }
  console.log('out of box');
  return false;
};

export const AutoMLExport = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (user) => {
    // console.log('updateDataSet');
    // updateDataSet(models, args.projectId, user.id);
    // return '[ok]';
    // getOperationStatus('projects/244101471703/locations/us-central1/operations/IOD4554992450120187904');
    // return '[ok]';
    pusblishProgress(`fetching ${args.label} files...`, user.id);
    // const criteria = {
    //   'metadata.id': models.toObjectId(args.projectId),
    //   'metadata.autoMLExported': false,
    //   $text: { $search: args.label },
    //   'usersAnswers.0': { $exists: true },
    // };
    // let prepareLabelRegex = args.label.replace(/,/ig, '/,/');
    // prepareLabelRegex = '/'.concat(prepareLabelRegex, '/');
    // console.log(prepareLabelRegex);
    const aLabels = args.label.split(',');
    const regexLabels = args.label.replace(/,/gi, '|');

    const criteria = {
      'metadata.id': models.toObjectId(args.projectId),
      // file: 'e7e2bef0-dee7-11ea-8061-5b8f93e472ae.jpg',
      // $or: [
      //   {
      //     'metadata.autoMLExported': false,
      //   },
      //   {
      //     'metadata.autoMLExported': { $exists: false },
      //   },
      // ],
      usersAnswers: {
        $elemMatch: {
          answers: {
            $regex: regexLabels,
          },
        },
      },
      'usersAnswers.0': { $exists: true },
    };
    console.log(criteria);
    const uploadPath = '../../uploads';
    const filer = path.join(__dirname, uploadPath);

    const datas = await models.DataSet.find(criteria);
    console.log(datas.length);
    // const datas = await models.DataSet.aggregate()
    //   .match(criteria);
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
      console.log(aLabels);
      eachSeries(dataset, async (data, cb) => {
        if (fs.existsSync(`${filer}/${args.projectId}/${data.file}`)) {
          const file = bucket.file(data.file);
          const isFileExistsOnGC = await file.exists();
          console.log('file', data.file, isFileExistsOnGC[0]);
          // const width = (data.metadata.raw.ImageWidth) ? data.metadata.raw.ImageWidth : 400;
          // const height = (data.metadata.raw.ImageHeight) ? data.metadata.raw.ImageHeight : 300;
          if (isFileExistsOnGC && !isFileExistsOnGC[0]) {
            console.log(`file ${data.file} does\'nt exists on GC`);
            try {
              await bucket.upload(`${filer}/${args.projectId}/${data.file}`);
              await models.DataSet.findOneAndUpdate({ _id: data._id }, { 'metadata.autoMLExported': true });
              pusblishProgress(`upload file ${num}/~${dataset.length}`, user.id);
              num += 1;
              eachSeries(data.usersAnswers, async (answer, cbAnswer) => {
                const label = JSON.parse(answer.answers);
                if (label.label && (aLabels.indexOf(label.label.id) > -1)) {
                  console.log(label.label.id);
                  const row = await setAutoMLCsvRow(data, label, `${filer}/${args.projectId}`);
                  if (row) {
                    selectedDatas.push(data);
                    csv.push(row.csv);
                  }
                  cbAnswer();
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
            eachSeries(data.usersAnswers, async (answer, cbAnswer) => {
              const label = JSON.parse(answer.answers);
              if (label.label && (aLabels.indexOf(label.label.id) > -1 || aLabels.indexOf(label.label._id) > -1)) {
                try {
                  const row = await setAutoMLCsvRow(data, label, `${filer}/${args.projectId}`);
                  if (row) {
                    selectedDatas.push(data);
                    csv.push(row.csv);
                  }
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
          }
        } else {
          console.log('file does\'nt exists on this server');
          cb();
        }
      }, async () => {
        console.log(csv);
        fs.writeFileSync('/tmp/googleVisionFilename.csv', csv.join('\n'), 'binary');
        await bucket.upload('/tmp/googleVisionFilename.csv', { destination: `/csv/googleVisionFilename_${moment().format('YYYY_MM_DD_HH_mm_ss')}.csv` });
        await bucket.upload('/tmp/googleVisionFilename.csv');
        pusblishProgress('upload done !', user.id);
        console.log('done');
        resolve(selectedDatas);
      });
    });
  },
);

export const CountDataSetBySource = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    const criteria = {
      'metadata.id': models.toObjectId(args.projectId),
    };
    if (args.user) {
      criteria.user = models.toObjectId(args.user);
    }
    if (args.label) {
      criteria.usersAnswers = {
        $elemMatch: {
          answers: {
            $regex: args.label,
          },
        },
      };
    }
    try {
      const num = await models.DataSet.countDocuments(criteria);
      return num;
    } catch (e) {
      console.log(e);
    }
  },
);

export const checkAutoMLFiles = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    try {
      const results = [];
      const file = bucket.file('googleVisionFilename.csv');
      await file.download({
        destination: '/tmp/googleVisionFilename.csv',
      });
      return new Promise(async (resolve, reject) => {
        fs.createReadStream('/tmp/googleVisionFilename.csv')
          .pipe(csv({ headers: false, separator: ',' }))
          .on('data', data => results.push(data))
          .on('end', () => {
            const cleanCsv = [];
            const num = results.length;
            let i = 1;
            eachSeries(results, async (row, cb) => {
              try {
                const basename = row[1].replace(/gs:\/\/ia-garbage-build\//ig, '');
                const file = bucket.file(basename);
                const isFileExistsOnGC = await file.exists();
                if (isFileExistsOnGC[0]) {
                  if (checkBoundingBox([row[3], row[4], row[7], row[8]])) {
                    console.log(`${i}/${num}`, basename, isFileExistsOnGC[0]);
                    cleanCsv.push(`,gs://ia-garbage-build/${basename},${row[2]},${row[3]},${row[4]},,,${row[7]},${row[8]},,`);
                  } else {
                    console.log(`${i}/${num}`, basename, `${row[2]},${row[3]},${row[4]},${row[7]},${row[8]}`, 'OUTOFBOX');
                  }
                } else {
                  console.log(`${i}/${num}`, basename, isFileExistsOnGC[0], 'DO NOT EXISTS');
                }
                i += 1;
              } catch (e) {
                console.log(e);
              }
              cb();
            }, async () => {
              // console.log(cleanCsv.join('\n'));
              fs.writeFileSync('/tmp/googleVisionFilename.csv', cleanCsv.join('\n'), 'binary');
              try {
                const csvFileUpload = await bucket.upload('/tmp/googleVisionFilename.csv');
                console.log(csvFileUpload);
              } catch (e) {
                console.log(e);
              }
              resolve('ok');
            });
          });
      });
    } catch (e) {
      console.log(e);
    }
  },
);

