import mongoose from 'mongoose';

const labelsSchema = mongoose.Schema({
  uid: String,
  type: { type: String, default: 'polygon' },
  text: String,
  photo: String,
  icon: String,
  isObstacle: Boolean,
}, {
  collection: 'labels',
});

const Labels = mongoose.model('Labels', labelsSchema);

export default Labels;
