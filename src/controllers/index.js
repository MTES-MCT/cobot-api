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
import prettyBytes from 'pretty-bytes';

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
  mv(`${uploadeFolder}/${file}`, `${folderName}/${file}`, { mkdirp: true }, (err) => {
    return callback(err);
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
  DataSet,
  Dms2Dec,
  Unzip,
};
