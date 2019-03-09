import mongoose from 'mongoose';

const datasetSchema = mongoose.Schema({
  file: String,
  question: String,
  metadata: {
    source: String,
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Projects' },
    geoData: {},
    raw: {},
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
