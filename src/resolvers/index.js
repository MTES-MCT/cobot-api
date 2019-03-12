import {
  AutoLogin,
  Me,
  User,
  Users,
  WakeUpUsers,
  createUser,
  updateUser,
  updateUserPassword,
  updateUserActivity,
  updateUserReminder,
  updateUserProjects,
  updateUserProjectsRole,
  authorization,
  loginByBot,
} from './user';
import Actions from './action';
import { DataSet, DataSetBySource, DataSetStats, dataSetAnswers } from './dataset';
import { Messages, Message, updateMessage, deleteMessage } from './messages';
import {
  Project,
  ProjectContributors,
  createProject,
  deleteProject,
  createProjectContributor,
  deleteProjectContributor,
  updateProject,
} from './project';

import contributionAdded from './contribution';

export default {
  Query: {
    AutoLogin,
    Me,
    User,
    Users,
    WakeUpUsers,

    Actions,

    DataSet,
    DataSetBySource,
    DataSetStats,

    Messages,
    Message,

    Project,
    ProjectContributors,
  },
  Mutation: {
    createUser,

    updateUser,
    updateUserPassword,
    updateUserActivity,
    updateUserReminder,
    updateUserProjects,
    updateUserProjectsRole,

    authorization,
    loginByBot,

    dataSetAnswers,

    updateMessage,
    deleteMessage,

    createProject,
    deleteProject,
    createProjectContributor,
    deleteProjectContributor,
    updateProject,
  },
  Subscription: {
    contributionAdded,
  },
};