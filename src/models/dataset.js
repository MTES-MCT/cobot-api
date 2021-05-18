import mongoose from 'mongoose';

const datasetSchema = mongoose.Schema({
  file: String,
  question: String,
  user: mongoose.Schema.Types.ObjectId,
  metadata: {
    source: String,
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Projects' },
    geoData: {},
    raw: {},
    originalWidth: Number,
    originalHeight: Number,
    originalOrientation: Number,
    autoMLExported: Boolean,
  },
  availableAnswers: [{
    text: String,
    order: Number,
  }],
  usersAnswers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    answers: String,
    createdAt: Date,
  }],
}, {
  collection: 'dataset',
});

const DataSet = mongoose.model('DataSet', datasetSchema);

export default DataSet;
