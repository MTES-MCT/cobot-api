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
import exif from 'jpeg-exif';
import dms2dec from 'dms2dec';

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

const parseGpsData = (data) => {
  data[0] = `${data[0]}/1`;
  data[1] = `${data[1]}/1`;
  const second = data[2].toString().split('.');
  data[2] = `${parseInt(second[0], 10)}/${parseInt(second[1], 10)}`;
  return data.join(',');
};

const DataSet = async (context) => {
  const {
    projectId,
    projectName,
    question,
    answers,
  } = context.body;
  try {
    return checkAuthAndResolve(context, async () => {
      const dataset = {
        file: context.file.filename,
        question,
        availableAnswers: JSON.parse(answers),
        metadata: {
          id: projectId,
          source: projectName.replace(/\s/g, '').toLowerCase(),
          geoData: context.metadata.geoData,
          raw: context.metadata.raw,
        },
      };
      try {
        const newDataSet = await models.DataSet.create(dataset);
        return newDataSet;
      } catch (error) {
        throw new Error(error);
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

const moveFile = (source, dest, file, callback) => {
  const uploadeFolder = path.join(__dirname, source);
  const folderName = path.join(__dirname, dest);
  mv(`${uploadeFolder}/${file}`, `${folderName}/${file}`, { mkdirp: true }, (err) => {
    return callback(err);
  });
};

const DataSetFromDropbox = async (context, callback) => {
  const files = [];
  const fileName = uuid();
  const fileNameZip = `${fileName}.zip`;
  const headers = {
    responseType: 'arraybuffer',
  };

  const zip = await axios.get(context.body.url, headers);
  const uploadPath = path.join(__dirname, `../../uploads/${context.body.projectId}`);
  const filepathZip = path.join(uploadPath, fileNameZip);
  const filepath = path.join(uploadPath, fileName);

  context.metadata = {
    geoData: null,
    raw: null,
  };

  try {
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
  } catch (err) {
    if (err) { throw err; }
  }

  fs.writeFile(filepathZip, zip.data, (err) => {
    if (err) { throw err; }
    const zipper = fs.createReadStream(filepathZip)
      .pipe(unzipper.Extract({ path: filepath }));

    zipper.on('close', () => {
      fs.readdir(filepath, (readDirErr, items) => {
        if (readDirErr) { throw readDirErr; }
        eachSeries(items, (item, cb) => {
          const metadata = exif.parseSync(`${filepath}/${item}`);
          if (metadata && metadata.GPSInfo) {
            const GPSLatitude = parseGpsData(metadata.GPSInfo.GPSLatitude);
            const { GPSLatitudeRef } = metadata.GPSInfo;
            const GPSLongitude = parseGpsData(metadata.GPSInfo.GPSLongitude);
            const { GPSLongitudeRef } = metadata.GPSInfo;
            const dec = dms2dec(GPSLatitude, GPSLatitudeRef, GPSLongitude, GPSLongitudeRef);
            context.metadata = {
              geoData: {
                location: {
                  coordinates: dec,
                  type: 'Point',
                },
              },
              raw: metadata,
            };
          }
          mv(`${filepath}/${item}`, `${uploadPath}/${item}`, { mkdirp: true }, async (mvErr) => {
            if (mvErr) throw mvErr;
            files.push(item);
            context.file = {
              filename: item,
            };
            await DataSet(context);
            return cb();
          });
        }, (seriesErr) => {
          if (seriesErr) { throw seriesErr; }
          rimraf.sync(filepath);
          rimraf.sync(filepathZip);
          return callback(files);
        });
      });
    });
    zipper.on('error', (error) => {
      throw error;
    });
  });
};

module.exports = {
  Auth,
  User,
  moveFile,
  DataSet,
  DataSetFromDropbox,
};
