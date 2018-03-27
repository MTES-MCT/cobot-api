import mongoose from 'mongoose';

const datasetSchema = mongoose.Schema({
  name: String,
  file: String,
  question: String,
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
