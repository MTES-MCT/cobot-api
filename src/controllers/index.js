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
        width: metadata.raw.ImageWidth,
        height: metadata.raw.ImageHeight,
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
        const dir = `uploads/extract-${query.projectId}`;
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, '0777');
        }
        const criteria = query.criteria.split(',');
        eachSeries(data, (d, cb) => {
          const answers = _.map(d.usersAnswers, 'answers');
          _.each(answers, (answer) => {
            const a = JSON.parse(answer);
            if (criteria.indexOf(a.label.id) > -1) {
              fs.copyFile(`uploads/${query.projectId}/${d.file}`, `${dir}/${d.file}`, (err) => {
                if (err) throw err;
                const pascalVocFilename = `${d.file.split('.')[0]}.xml`;
                fs.writeFileSync(`${dir}/${pascalVocFilename}`, pascalVoc(d.file, d.metadata, a), 'binary');
                cb();
              });
            } else {
              cb();
            }
          });
        }, async () => {
          await zipdata(dir);
          resolve(dir);
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
