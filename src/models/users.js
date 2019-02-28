import mongoose from 'mongoose';

const usersSchema = mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  reminder: Date,
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
    slotNumAnswers: { type: Number, default: 0 },
    numAnswers: { type: Number, default: 0 },
    wakeUpLogs: {
      at: Date,
      channel: String,
    },
  },
  projects: [{
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Projects',
    },
    name: String,
    role: {
      type: Number,
      validate: {
        validator: v => [1, 80, 100].indexOf(v) > -1,
        message: '{VALUE} should be 1, 80 or 100',
      },
    },
  }],
  lastConnection: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'users',
});

const Users = mongoose.model('Users', usersSchema);

export default Users;
