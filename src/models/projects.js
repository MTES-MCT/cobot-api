import mongoose from 'mongoose';

const projectsSchema = mongoose.Schema({
  name: String,
  question: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  answers: [{
    text: String,
    order: Number,
  }],
}, {
  collection: 'projects',
});

const Projects = mongoose.model('Projects', projectsSchema);

export default Projects;
