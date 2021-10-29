import mongoose from 'mongoose';

const projectsSchema = mongoose.Schema({
  name: String,
  details: String,
  question: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  answers: [{
    text: String,
    order: Number,
  }],
  labels: [{
    id: mongoose.Schema.Types.ObjectId,
    text: String,
    order: Number,
    properties: [{
      name: String,
      val_1: String,
      val_2: String,
      val_3: String,
    }],
  }],
  iaModels: [
    {
      name: String,
      operation: String,
      status: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
}, {
  collection: 'projects',
});

const Projects = mongoose.model('Projects', projectsSchema);

export default Projects;
