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
import { DataSet, DataSetBySource, DataSetStats, dataSetAnswers, dataDelete } from './dataset';
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

import { dropbox, uploadProgress } from './upload';

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

    dropbox,

    updateUser,
    updateUserPassword,
    updateUserActivity,
    updateUserReminder,
    updateUserProjects,
    updateUserProjectsRole,

    authorization,
    loginByBot,

    dataSetAnswers,
    dataDelete,

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
    uploadProgress,
  },
};
