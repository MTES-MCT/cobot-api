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
import { AutoMLExport, DataSet, DataSetBySource, DataSetStats, dataSetAnswers, dataDelete, DataSetNumLabel, CountDataSetBySource } from './dataset';
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

    AutoMLExport,
    DataSet,
    DataSetBySource,
    DataSetStats,
    DataSetNumLabel,
    CountDataSetBySource,

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
