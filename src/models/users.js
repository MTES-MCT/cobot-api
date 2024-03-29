import mongoose from 'mongoose';

const usersSchema = mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId },
  email: { type: String, unique: true },
  password: String,
  resetPasswordToken: String,
  pseudo: String,
  name: String,
  reminder: Date,
  birthday: Date,
  photo: String,
  city: String,
  point: [{
    num: Number,
    createdAt: Date,
    object: String,
    objectType: String,
  }],
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
    isPro: Boolean,
    question: String,
    answers: [{
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Projects',
      },
      text: String,
      order: Number,
    }],
    labels: [{
      _id: mongoose.Schema.Types.ObjectId,
      text: String,
      photo: String,
      icon: String,
      order: Number,
      properties: [{
        name: String,
        val_1: String,
        val_2: String,
        val_3: String,
      }],
    }],
  }],
  lastConnection: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'users',
});

const Users = mongoose.model('Users', usersSchema);

export default Users;
