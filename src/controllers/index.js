import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { checkAuthAndResolve } from '../policies';
import models from '../models';
<<<<<<< HEAD
import { cpus } from 'os';
=======
>>>>>>> 1a0f28b69527dd0ab9091378f5cf74624b9f5efa

const Auth = async (email, password) => {
  try {
    const user = await models.Users.findOne({ email });
    if (!user) {
      throw new Error('No user with that email');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Bad password');
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
  } catch (error) {
    throw new Error(error);
  }
};

const User = async (context) => {
  try {
    return checkAuthAndResolve(context, async (token) => {
      const user = await models.Users.findById(token.id);
      if (!user) {
        throw new Error('No user with that email');
      } else {
        return user;
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

const DataSet = async (context) => {
  const { projectName, question, answers } = context.body;
  try {
    return checkAuthAndResolve(context, async () => {
      const dataset = {
        file: context.file.filename,
        question,
        availableAnswers: answers,
        metadata: {
          source: projectName.replace(/\s/g, '').toLowerCase(),
        },
      };
      try {
        const newDataSet = await models.DataSet.create(dataset);
        return newDataSet;
      } catch (error) {
        throw new Error(error);
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  Auth,
  User,
  DataSet,
};
