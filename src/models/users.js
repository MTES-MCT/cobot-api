import mongoose from 'mongoose';

const usersSchema = mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  role: {
    type: Number,
    validate: {
      validator: v => [1, 80, 100].indexOf(v) > -1,
      message: '{VALUE} should be 1, 80 or 100',
    },
  },
  bots: [{
    channel: String,
    channelUid: String,
    token: String,
  }],
  activity: {
    lastAnswersAt: Date,
    wakeUpLogs: {
      at: Date,
      channel: String,
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'users',
});

const Users = mongoose.model('Users', usersSchema);

export default Users;
