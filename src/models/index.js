import mongoose from 'mongoose';
import fs from 'fs';
import tunnel from 'tunnel-ssh';
import config from '../config';
import Logger from '../utils/logger';

import Users from './users';
import DataSet from './dataset';
import Projects from './projects';
import Labels from './labels';
import * as Messages from './messages';


if (process.env.NODE_ENV === 'development') {
  const id_rsa = fs.readFileSync('/Users/stephanelegouffe/.ssh/id_rsa');
  const sshConfig = {
    username: 'coconstruisons',
    host: '91.121.77.104',
    port: 22,
    privateKey: id_rsa,
    dstHost: 'localhost',
    dstPort: 27017,
  };

  tunnel(sshConfig, (error, server) => {
    if (error) {
      console.log(`SSH connection error: ${error}`);
    }
    mongoose.set('debug', false);
    mongoose.set('useNewUrlParser', true);
    mongoose.set('useCreateIndex', true);
    mongoose.set('useFindAndModify', false);
    mongoose.connect(`mongodb://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}?authSource=admin`).then(
      () => {
        exports.Actions = Messages.Actions;
        exports.Attachments = Messages.Attachments;
        exports.DataSet = DataSet;
        exports.Messages = Messages.Message;
        exports.Users = Users;
        exports.Projects = Projects;
        exports.Labels = Labels;

        // utils
        exports.toObjectId = string => mongoose.Types.ObjectId(string);

        Logger.log('info', 'Connected to database "%s"', config.database.name);
      },
      (err) => { throw new Error('Unable to connect to mongodb', err); },
    );
  });
} else {
  mongoose.set('debug', false);
  mongoose.set('useNewUrlParser', true);
  mongoose.set('useCreateIndex', true);
  mongoose.set('useFindAndModify', false);
  mongoose.connect(`mongodb://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}?authSource=admin`).then(
    () => {
      exports.Actions = Messages.Actions;
      exports.Attachments = Messages.Attachments;
      exports.DataSet = DataSet;
      exports.Messages = Messages.Message;
      exports.Users = Users;
      exports.Projects = Projects;
      exports.Labels = Labels;

      // utils
      exports.toObjectId = string => mongoose.Types.ObjectId(string);

      Logger.log('info', 'Connected to database "%s"', config.database.name);
    },
    (err) => { throw new Error('Unable to connect to mongodb', err); },
  );
}
