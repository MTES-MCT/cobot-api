import mongoose from 'mongoose';

const labelsSchema = mongoose.Schema({
  uid: String,
  type: { type: String, default: 'polygon' },
  text: String,
  photo: String,
  icon: String,
  isObstacle: Boolean,
  properties: [{
    name: String,
    val_1: String,
    val_2: String,
    val_3: String,
  }],
}, {
  collection: 'labels',
});

const Labels = mongoose.model('Labels', labelsSchema);

export default Labels;
