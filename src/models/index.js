import mongoose from 'mongoose';
import config from '../config';
import Logger from '../utils/logger';

import Users from './users';
import DataSet from './dataset';
import * as Messages from './messages';

mongoose.set('debug', false);
mongoose.connect(`mongodb://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.name}?authSource=admin`).then(
  () => {
    exports.Attachments = Messages.Attachments;
    exports.DataSet = DataSet;
    exports.Messages = Messages.Message;
    exports.Users = Users;

    // utils
    exports.toObjectId = string => mongoose.Types.ObjectId(string);

    Logger.log('info', 'Connected to database "%s"', config.database.name);
  },
  (err) => { throw new Error('Unable to connect to mongodb', err); },
);
