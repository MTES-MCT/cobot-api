/* eslint-disable no-underscore-dangle */
import Promise from 'bluebird';
import _ from 'lodash';
import { checkAuthAndResolve, checkRoleAndResolve, AUTH_SUPERADMIN } from './common';

export const Messages = async (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  AUTH_SUPERADMIN,
  () => models.Messages
    .find()
    .populate({
      path: 'attachments',
      populate: [{
        path: 'actions',
      }],
    }),
);

export const Message = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async () => {
    const criteria = (args.name) ? { name: args.name } : { _id: args.id };
    const message = await models.Messages
      .findOne(criteria)
      .populate({
        path: 'attachments',
        populate: [{
          path: 'actions',
        }],
      });

    if (criteria.name) {
      message.text = _.minBy(message.text, text => text.counter);
      // Update message.text counter
      await models.Messages.findOneAndUpdate({
        _id: message.id,
        text: {
          $elemMatch: {
            text: message.text[0].text,
            counter: message.text[0].counter,
          },
        },
      }, {
        $inc: {
          'text.$.counter': 1,
        },
      });
    }

    if (criteria.name) {
      await Promise.map(message.attachments, async (attachment) => {
        attachment.text = _.minBy(attachment.text, text => text.counter);

        // Update message.attachment.text counter
        await models.Attachments.findOneAndUpdate({
          _id: attachment.id,
          text: {
            $elemMatch: {
              text: attachment.text[0].text,
              counter: attachment.text[0].counter,
            },
          },
        }, {
          $inc: {
            'text.$.counter': 1,
          },
        });
      });
    }

    return message;
  },
);

export const updateMessage = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  AUTH_SUPERADMIN,
  async () => {
    // Delete Old Main Message
    await models.Messages.findOneAndUpdate({
      _id: args.id,
    }, {
      $unset: {
        text: '',
      },
    });

    // Add New Main Message
    await models.Messages.findOneAndUpdate({
      _id: args.id,
    }, {
      $push: {
        text: args.message,
      },
    });

    // update Attachement
    await models.Attachments.findOneAndUpdate({
      _id: args.attachments[0].id,
    }, {
      $unset: {
        text: '',
      },
    });

    await models.Attachments.findOneAndUpdate({
      _id: args.attachments[0].id,
    }, {
      $push: {
        text: args.attachments[0].text,
      },
      $set: {
        image: args.attachments[0].image,
        callback: args.attachments[0].callback,
      },
    });

    await models.Attachments.findOneAndUpdate({
      _id: args.attachments[0].id,
    }, {
      $unset: {
        actions: '',
      },
    });

    await Promise.map(args.actions, async (action) => {
      await models.Attachments.findOneAndUpdate({
        _id: args.attachments[0].id,
      }, {
        $push: {
          actions: action.id,
        },
      });
    });

    return args.id;
  },
);

export const deleteMessage = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  AUTH_SUPERADMIN,
  () => models.Messages.remove({ _id: args.id }),
);
