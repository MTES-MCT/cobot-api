import mongoose from 'mongoose';
import config from '../config';
import Logger from '../utils/logger';

import Users from './users';
import * as Messages from './messages';

mongoose.set('debug', false);
mongoose.connect(`mongodb://${config.database.host}:${config.database.port}/${config.database.name}`).then(
  () => {
    exports.Users = Users;
    exports.Messages = Messages.Message;
    exports.Attachments = Messages.Attachments;
    Logger.log('info', 'Connected to database "%s"', config.database.name);
  },
  (err) => { throw new Error('Unable to connect to mongodb', err); },
);
