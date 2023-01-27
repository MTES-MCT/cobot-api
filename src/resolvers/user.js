/* eslint-disable no-underscore-dangle */
import bcrypt from 'bcrypt';
import Promise from 'bluebird';
import jwt from 'jsonwebtoken';
import _ from 'lodash';
import { checkAuthAndResolve, checkRoleAndResolve, AUTH_SUPERADMIN } from './common';
import { SEND_FORGOT_PASSWORD } from '../services/sendinblue';

export const Me = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (token) => {
    const user = await models.Users.findById(token.id);
    const userProjectDetails = [];
    await Promise.map(user.projects, async (project) => {
      const projectDetails = await models.Projects.findById(project.id);
      if (projectDetails) {
        const projectLabels = [];
        if (projectDetails.labels) {
          await Promise.map(projectDetails.labels, async (label) => {
            const l = {};
            const labelDetails = await models.Labels.findOne({
              _id: models.toObjectId(label._id),
            });
            if (labelDetails) {
              l._id = label._id;
              l.text = labelDetails.text;
              l.icon = labelDetails.icon;
              l.photo = labelDetails.photo;
              l.order = label.order;
              l.properties = label.properties;
              projectLabels.push(l);
            } else {
              projectLabels.push(label);
            }
          });
        }
        userProjectDetails.push({
          id: project.id,
          name: projectDetails.name,
          role: project.role,
          question: projectDetails.question,
          answers: projectDetails.answers,
          labels: projectLabels,
        });
      }
    });
    user.projects = userProjectDetails;
    return user;
  },
);

export const User = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  () => models.Users.findById(args.id),
);

export const Users = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  AUTH_SUPERADMIN,
  () => models.Users.find(),
);

export const AutoLogin = async (parent, args, { models }) => {
  const user = await models.Users.findOne({ email: args.email });
  if (user) {
    return {
      id: user._id,
      email: user.email,
      lastConnection: user.lastConnection,
    };
  }
  return null;
};

export const WakeUpUsers = async (parent, args, { models, req }) => {
  const users = await checkRoleAndResolve(
    req,
    AUTH_SUPERADMIN,
    () => models.Users.find({
      $and: [
        {
          $or: [
            {
              reminder: {
                $lte: new Date(),
              },
            },
            {
              reminder: null,
            },
          ],
        },
        {
          $or: [
            {
              'activity.lastAnswersAt': {
                $lte: new Date(args.lastAnswers),
              },
            },
            {
              'activity.lastAnswersAt': null,
            },
          ],
        },
      ],
    }),
  );
  return users;
};

export const createUser = async (parent, args, { models }) => {
  const user = args;
  let bot;
  if (user.bots) {
    bot = user.bots;
    delete user.bots;
  }
  user.password = await bcrypt.hash(user.password, 12);
  try {
    const isExists = await models.Users.findOne({
      $or: [
        { pseudo: user.pseudo },
        { email: user.email },
      ],
    });
    if (!isExists) {
      const newUser = await models.Users.findOneAndUpdate({
        email: user.email,
      }, user, { new: true, upsert: true });
      if (bot) {
        await models.Users.findByIdAndUpdate(newUser._id, {
          $push: {
            bots: bot,
          },
        });
      }
      return newUser;
    }
    throw new Error('Pseudo or Email already exists');
  } catch (error) {
    return error;
  }
};

export const updateUser = async (parent, args, { models, req }) => {
  const user = args;
  delete user.id;
  let bot;
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 12);
  }
  if (user.bots) {
    bot = user.bots;
    delete user.bots;
  }

  const updatedUser = await checkAuthAndResolve(req, userJwt =>
    models.Users.findByIdAndUpdate(userJwt.id, user, { new: true }));

  if (bot) {
    await checkAuthAndResolve(req, userJwt =>
      models.Users.findByIdAndUpdate(userJwt.id, {
        $push: {
          bots: bot,
        },
      }));
  }

  return updatedUser;
};

export const updateUserPoint = async (parent, args, { models, req }) => {
  const { point } = args;
  console.log('point', point);
  const updatedUser = await checkAuthAndResolve(req, userJwt =>
    models.Users.findByIdAndUpdate(userJwt.id, {
      $push: {
        point,
      },
    }, {
      new: true,
    }));
  return updatedUser;
};

export const updateUserPassword = async (parent, args, { models }) => {
  const password = await bcrypt.hash(args.password, 12);
  const users = await models.Users.findByIdAndUpdate(args.id, {
    password,
  });
  return users;
};

export const updateUserActivity = async (parent, args, { models, req }) => {
  const users = await checkAuthAndResolve(
    req,
    () => models.Users.findByIdAndUpdate(args.id, {
      activity: args.activity,
    }, {
      new: true,
    }),
  );
  return users;
};

export const updateUserReminder = async (parent, args, { models, req }) => {
  const users = await checkAuthAndResolve(
    req,
    user => models.Users.findByIdAndUpdate(user.id, {
      reminder: args.reminder,
    }, {
      new: true,
    }),
  );
  return users;
};

export const updateUserProjects = async (parent, args, { models, req }) => {
  const user = await checkAuthAndResolve(
    req,
    () => models.Users.findByIdAndUpdate(args.id, {
      $push: {
        projects: {
          id: args.projects.id,
          role: args.projects.role,
        },
      },
    }, {
      new: true,
    }),
  );
  return user;
};

export const updateUserProjectsRole = async (parent, args, { models, req }) => {
  const user = await checkAuthAndResolve(
    req,
    () => models.Users.findOneAndUpdate({ email: args.email, 'projects.id': models.toObjectId(args.projects.id) }, {
      $set: {
        'projects.$': args.projects,
      },
    }, {
      new: true,
    }),
  );
  return user;
};

export const userRanking = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
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

export const userPhotos = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (userJwt) => {
    const photo = await models.DataSet.find({
      user: userJwt.id,
    });
    return photo;
  },
);

export const authorization = async (parent, { email, password }, { models }) => {
  const user = await models.Users.findOne({ email });
  if (!user) {
    throw new Error('No user with that email');
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error('Incorrect password');
  }
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
    },
  );
  return token;
};

export const loginByBot = async (parent, args, { models }) => {
  const user = await models.Users.findOne({
    'bots.channel': args.channel,
    'bots.channelUid': args.channelUid,
  });
  if (!user) {
    throw new Error('Can\'t find user on channel %s with uid %s', args.channel, args.channelUid);
  }
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
    },
  );
  user.token = token;
  return user;
};

export const forgotPassword = async (parent, args, { models }) => {
  const user = await models.Users.findOne({ email: args.email });
  if (user) {
    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      },
    );
    await models.Users.findByIdAndUpdate(user.id, {
      resetPasswordToken: token,
    });
    try {
      SEND_FORGOT_PASSWORD(user.email, user.pseudo, token);
    } catch (e) {
      console.log(e);
    }
    return true;
  }
  return false;
};

export const updateForgotPassword = async (parent, args, { models }) => {
  try {
    jwt.verify(
      args.token,
      process.env.JWT_SECRET,
    );
    const user = await models.Users.findOne({
      resetPasswordToken: args.token,
    });
    if (user) {
      try {
        await models.Users.findByIdAndUpdate(user.id, {
          password: await bcrypt.hash(args.password, 12),
          resetPasswordToken: null,
        });
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
};

export const updateForgotPasswordCheckCode = async (parent, args, { models }) => {
  try {
    jwt.verify(
      args.token,
      process.env.JWT_SECRET,
    );
    const user = await models.Users.findOne({
      resetPasswordToken: args.token,
    });
    if (user) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};
