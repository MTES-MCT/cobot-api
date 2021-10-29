import {
  AutoLogin,
  Me,
  User,
  userPhotos,
  Users,
  WakeUpUsers,
  createUser,
  updateUser,
  updateUserPoint,
  updateUserPassword,
  updateUserActivity,
  updateUserReminder,
  updateUserProjects,
  updateUserProjectsRole,
  userRanking,
  authorization,
  loginByBot,
} from './user';
import Actions from './action';
import { AutoMLExport, checkAutoMLFiles, DataSet, DataSetBySource, DataSetStats, dataSetAnswers, dataDelete, DataSetNumLabel, CountDataSetBySource } from './dataset';
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

import {
  Labels,
  createLabel,
  updateLabel,
  labelDelete,
} from './labels';

import { dropbox, uploadProgress } from './upload';

import contributionAdded from './contribution';

export default {
  Query: {
    AutoLogin,
    Me,
    User,
    userPhotos,
    Users,
    userRanking,
    WakeUpUsers,

    Actions,

    AutoMLExport,
    DataSet,
    DataSetBySource,
    DataSetStats,
    DataSetNumLabel,
    CountDataSetBySource,
    checkAutoMLFiles,

    Labels,

    Messages,
    Message,

    Project,
    ProjectContributors,
  },
  Mutation: {
    createUser,

    dropbox,

    updateUser,
    updateUserPoint,
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

    createLabel,
    updateLabel,
    labelDelete,
  },
  Subscription: {
    contributionAdded,
    uploadProgress,
  },
};
