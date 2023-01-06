import mongoose from 'mongoose';

const datasetSchema = mongoose.Schema({
  file: String,
  question: String,
  class: String,
  isObstacle: Boolean,
  isExpired: Boolean,
  // user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  user: mongoose.Schema.Types.ObjectId,
  metadata: {
    source: String,
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Projects' },
    geoData: {
      createdAt: Date,
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
        },
        speed: {
          type: mongoose.Types.Decimal128,
        },
        altitude: {
          type: mongoose.Types.Decimal128,
        },
        acciracy: {
          type: mongoose.Types.Decimal128,
        },
      },
    },
    raw: {},
    originalWidth: Number,
    originalHeight: Number,
    originalOrientation: Number,
    autoMLExported: Boolean,
    distance: Number,
  },
  availableAnswers: [{
    text: String,
    order: Number,
  }],
  usersAnswers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    answers: {
      type: String, text: true,
    },
    createdAt: Date,
  }],
  user_doc: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  status: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
      status: {
        type: Number,
      },
      updatedAt: Date,
    },
  ],
}, {
  collection: 'dataset',
});

// datasetSchema.index({ metadata.geoData.location: '2dsphere' });
const DataSet = mongoose.model('DataSet', datasetSchema);

export default DataSet;
