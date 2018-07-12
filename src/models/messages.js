import mongoose from 'mongoose';

const messagesSchema = mongoose.Schema({
  name: String,
  text: [{ text: String, counter: Number }],
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachments' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'messages',
});

const attachementsSchema = mongoose.Schema({
  text: [{ text: String, counter: Number }],
  image: String,
  color: String,
  callback: String,
  actions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Actions' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  collection: 'attachments',
});

const actionsSchema = mongoose.Schema({
  name: String,
  text: String,
  type: String,
  order: Number,
  value: String,
}, {
  collection: 'actions',
});

const Actions = mongoose.model('Actions', actionsSchema);
const Attachments = mongoose.model('Attachments', attachementsSchema);
const Message = mongoose.model('Messages', messagesSchema);

export { Actions, Attachments, Message };
