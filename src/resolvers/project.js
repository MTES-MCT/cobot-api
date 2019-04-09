import bcrypt from 'bcrypt';
import _ from 'lodash';
import { checkRoleAndResolve, checkAuthAndResolve, ADMIN } from './common';

export const Project = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    const project = await models.Projects.findOne({
      _id: models.toObjectId(args.id),
    });
    return project;
  },
);

export const ProjectContributors = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    const contributors = await models.Users.aggregate([
      {
        $match: {
          'projects.id': models.toObjectId(args.id),
        },
      },
    ]);
    return contributors;
  },
);

export const createProject = async (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (user) => {
    const project = {
      name: args.name,
      details: args.details,
      question: args.question,
      answers: args.answers,
      owner: user.id,
    };
    try {
      const newProject = await models.Projects.create(project);
      return newProject;
    } catch (error) {
      return error;
    }
  },
);

export const deleteProject = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  () => models.Projects.remove({ _id: args.id }),
);

export const createProjectContributor = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    const contributors = await models.Users.findOne({ email: args.email });
    if (contributors) {
      const newContributor = await models.Users.findByIdAndUpdate(contributors.id, {
        $push: {
          projects: {
            id: args.id,
            role: args.role,
          },
        },
      }, {
        new: true,
      });
      return newContributor;
    }
    try {
      const newContributor = await models.Users.create({
        email: args.email,
        password: await bcrypt.hash('a&Hau"7&8%K&3wf_', 12),
        projects: [{
          id: args.id,
          role: args.role,
        }],
      });
      return newContributor;
    } catch (error) {
      return error;
    }
  },
);

export const deleteProjectContributor = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async () => {
    const contributors = await models.Users.findOne({ email: args.email });
    const projects = _.filter(contributors.projects, (project) => {
      return project.id.toString() !== args.id;
    });
    await models.Users.findOneAndUpdate({ _id: contributors.id }, { projects });
    const newContributors = await models.Users.aggregate([
      {
        $match: {
          'projects.id': models.toObjectId(args.id),
        },
      },
    ]);
    return newContributors;
  },
);

export const updateProject = async (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (user) => {
    const updatedProject = {
      name: args.name,
      question: args.question,
      answers: args.answers,
      owner: user.id,
    };
    try {
      const project = await models.Projects.findOne({ _id: args.id });
      await models.Projects.findOneAndUpdate({ _id: args.id }, updatedProject);
      // update Dataset question & answers
      await models.DataSet.updateMany({
        'metadata.source': args.id, // projectSlugName,
      }, {
        $set: {
          'metadata.id': args.id,
          'metadata.source': updatedProject.name.replace(/\s/g, '').toLowerCase(),
          question: updatedProject.question,
          availableAnswers: updatedProject.answers,
        },
      });
      // update Dataset users's answers
      await Promise.map(project.answers, async (answer, index) => {
        await models.DataSet.updateMany({
          'usersAnswers.answers': answer.text,
        }, {
          $set: {
            'usersAnswers.$.answers': updatedProject.answers[index].text,
          },
        });
      });

      return updatedProject;
    } catch (error) {
      return error;
    }
  },
);
