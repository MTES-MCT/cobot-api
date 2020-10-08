import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import uuid from 'uuid/v1';
import eachSeries from 'async/eachSeries';
import rimraf from 'rimraf';
import axios from 'axios';
import unzipper from 'unzipper';
import mv from 'mv';
import fs from 'fs';
import path from 'path';
import gm from 'gm';
import exif from 'jpeg-exif';
import dms2dec from 'dms2dec';
import prettyBytes from 'pretty-bytes';
import _ from 'lodash';
import jsonxml from 'jsontoxml';
import archiver from 'archiver';
import mvFile from 'move-file';

import { checkAuthAndResolve } from '../policies';
import models from '../models';

const Auth = async (email, password) => {
  try {
    const user = await models.Users.findOne({ email });
    if (!user) {
      throw new Error('No user with that email');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Bad password');
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
    await models.Users.findByIdAndUpdate(user._id, { lastConnection: new Date() });
    return {
      token,
      user,
    };
  } catch (error) {
    throw new Error(error);
  }
};

const User = async (context) => {
  try {
    return checkAuthAndResolve(context, async (token) => {
      const user = await models.Users.findById(token.id);
      if (!user) {
        throw new Error('No user with that email');
      } else {
        return user;
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

const zipdata = dir => new Promise((resolve) => {
  const output = fs.createWriteStream(`${dir}.zip`);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });
  archive.pipe(output);
  output.on('close', () => {
    resolve('done');
  });
  archive.directory(`${dir}/`, false);
  archive.finalize();
});

const pascalVoc = (file, metadata, data) => jsonxml({
  annotation: [
    {
      folder: 'images',
      filename: file,
      path: file,
      source: {
        database: 'StreetCo',
      },
      size: {
        width: (metadata.raw.ImageWidth) ? metadata.raw.ImageWidth : 400,
        height: (metadata.raw.ImageHeight) ? metadata.raw.ImageHeight : 300,
        depth: 3,
      },
      segemented: 0,
      object: {
        name: data.label.id,
        pose: 'Unspecified',
        truncated: 1,
        difficult: 0,
        bndbox: {
          xmin: data.voc.xmin,
          ymin: data.voc.yminVoc,
          xmax: data.voc.xmax,
          ymax: data.voc.ymaxVoc,
        },
      },
    },
  ],
});

const ExportData = async (header, query) => {
  try {
    return checkAuthAndResolve(header, async token => new Promise(async (resolve) => {
      const data = await models.DataSet.aggregate([
        {
          $match: {
            'metadata.id': models.toObjectId(query.projectId),
            // 'usersAnswers.userId': {
            //   $ne: models.toObjectId('5cadef0f2f444e1a93fc7c3f'),
            // },
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
      ]).limit(10000);

      if (query.criteria) {
        const dir = path.join(__dirname, `../../uploads/extract-${query.projectId}`);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, '0777');
        }
        const dirTest = path.join(__dirname, `../../uploads/extract-${query.projectId}/test`);
        if (!fs.existsSync(dirTest)) {
          fs.mkdirSync(dirTest, '0777');
        }
        const criteria = query.criteria.split(',');
        const csv = [];
        eachSeries(data, (d, cb) => {
          // console.log('Working on file ', d.file);
          const answers = _.map(d.usersAnswers, 'answers');
          if (answers.length > 0) {
            let isCriteriaMatchingOnce = false;
            let filteredAnswer = answers[0];
            let a = JSON.parse(filteredAnswer);
            if (a.origin.length !== 4 && answers[1]) {
              // console.log('** Use alternative answer');
              filteredAnswer = answers[1];
              a = JSON.parse(filteredAnswer);
              // console.log(answers[1]);
            }
            if (a.label && criteria.indexOf(a.label.id) > -1 && a.origin.length) {
              if (!isCriteriaMatchingOnce) {
                isCriteriaMatchingOnce = true;
                // console.log('Criteria matching !', isCriteriaMatchingOnce);
                if (!query.isGoogleVision) {
                  fs.copyFile(path.join(__dirname, `../../uploads/${query.projectId}/${d.file}`), `${dir}/${d.file}`, (err) => {
                    if (err) throw err;
                    const pascalVocFilename = `${d.file.split('.')[0]}.xml`;
                    fs.writeFileSync(`${dir}/${pascalVocFilename}`, pascalVoc(d.file, d.metadata, a), 'binary');
                    // console.log('Pascal Voc file created.');
                    // console.log('Criteria matching one...next..');
                    cb();
                  });
                } else {
                  fs.copyFile(path.join(__dirname, `../../uploads/${query.projectId}/${d.file}`), `${dir}/${d.file}`, (err) => {
                    if (err) throw err;
                    const width = (d.metadata.raw.ImageWidth) ? d.metadata.raw.ImageWidth : 400;
                    const height = (d.metadata.raw.ImageHeight) ? d.metadata.raw.ImageHeight : 300;
                    const xmin = ((a.voc.xmin * 100) / width) / 100;
                    const ymin = ((a.voc.yminVoc * 100) / height) / 100;
                    const xmax = ((a.voc.xmax * 100) / width) / 100;
                    const ymax = ((a.voc.ymaxVoc * 100) / height) / 100;
                    csv.push(`,gs://ia-garbage-build/${d.file},${a.label.id},${xmin},${ymin},,,${xmax},${ymax},,`);
                    cb();
                  });
                }
              }
            } else {
              // console.log('Criteria NOT matching !');
              cb();
            }
            // _.each(firstAnswer, (answer) => {
            // });
          } else {
            // console.log('NO answer!');
            cb();
          }
        }, async () => {
          if (!query.isGoogleVision) {
            fs.readdir(dir, async (error, files) => {
              const totalFiles = files.length;
              const tenPct = Math.ceil(totalFiles / 10);
              let i = 0;
              while (i < tenPct) {
                await mvFile(`${dir}/${files[i]}`, `${dirTest}/${files[i]}`);
                i++;
              }
              await zipdata(dir);
              resolve(dir);
            });
          } else {
            const googleVisionFilename = 'googleVisionFilename.csv';
            fs.writeFileSync(`${dir}/${googleVisionFilename}`, csv.join('\n'), 'binary');
            await zipdata(dir);
            resolve(dir);
          }
        });
      }
    }));
  } catch (error) {
    throw new Error(error);
  }
};

const parseGpsData = (data) => {
  data[0] = `${parseFloat(data[0], 10)}/1`;
  data[1] = `${parseFloat(data[1], 10)}/1`;
  data[2] = `${parseFloat(data[2], 10)}/1`;
  return data.join(',');
};

const DataSet = async (context) => {
  const {
    projectId,
    projectName,
    question,
    answers,
    metadata,
  } = context;
  try {
    const dataset = {
      file: context.file.filename,
      question,
      availableAnswers: answers,
      metadata: {
        id: projectId,
        source: projectName.replace(/\s/g, '').toLowerCase(),
        geoData: metadata.geoData,
        raw: metadata.raw,
        originalWidth: metadata.originalWidth,
        originalHeight: metadata.originalHeight,
        originalOrientation: metadata.originalOrientation,
      },
    };
    try {
      const newDataSet = await models.DataSet.create(dataset);
      return newDataSet;
    } catch (error) {
      throw new Error(error);
    }
  } catch (error) {
    throw new Error(error);
  }
};

const moveFile = (source, dest, file, callback) => {
  const uploadeFolder = path.join(__dirname, source);
  const folderName = path.join(__dirname, dest);
  mv(`${uploadeFolder}/${file}`, `${folderName}/${file}`, { mkdirp: true }, err => callback(err));
};

const ResizeFile = (source, dest, size, callback) => {
  const gmImageMagick = gm.subClass({ imageMagick: true });
  gmImageMagick(source)
    .resize(size)
    .autoOrient()
    .noProfile()
    .write(dest, (resizeErr) => {
      if (resizeErr) throw resizeErr;
      return callback(dest);
    });
};

const Unzip = async (source, dest, callback) => {
  const zipper = fs.createReadStream(source)
    .pipe(unzipper.Extract({ path: dest }));

  zipper.on('close', () => callback(true));

  zipper.on('error', (error) => {
    throw error;
  });
};

const Dms2Dec = (GPSInfo) => {
  if (GPSInfo) {
    const GPSLatitude = parseGpsData(GPSInfo.GPSLatitude);
    const { GPSLatitudeRef } = GPSInfo;
    const GPSLongitude = parseGpsData(GPSInfo.GPSLongitude);
    const { GPSLongitudeRef } = GPSInfo;
    return dms2dec(GPSLatitude, GPSLatitudeRef, GPSLongitude, GPSLongitudeRef);
  }
  return null;
};

module.exports = {
  Auth,
  User,
  moveFile,
  ResizeFile,
  DataSet,
  Dms2Dec,
  Unzip,
  ExportData,
};
