/* eslint-disable import/prefer-default-export */
import axios from 'axios';
import prettyBytes from 'pretty-bytes';
import fs from 'fs';
import path from 'path';
import uuid from 'uuid/v1';

import { checkRoleAndResolve, pubsub, withFilter, UPLOAD_PROGRESS, ADMIN } from './common';

export const uploadProgress = {
  subscribe: withFilter(
    () => pubsub.asyncIterator(UPLOAD_PROGRESS),
    (payload, variables) => payload.uploadProgress.id.toString() === variables.uid.toString(),
  ),
};

// (payload, variables) => {
//   console.log(payload.progressUpload, variables);
// },
//   ),

export const dropbox = (parent, args, { models, req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async (user) => {
    const files = [];
    const fileName = uuid();
    const fileNameZip = `${fileName}.zip`;
    const uploadPath = path.join(__dirname, `../../uploads/${args.projectId}`);
    const filepathZip = path.join(uploadPath, fileNameZip);
    const filepath = path.join(uploadPath, fileName);
    const zip = fs.createWriteStream(filepathZip);
    const options = {
      responseType: 'stream',
    };
    // context.metadata = {
    //   geoData: null,
    //   raw: null,
    // };
    try {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath);
      }
    } catch (err) {
      if (err) { throw err; }
    }

    let downloadedBytes = 0;
    axios.get(args.url, options).then((response) => {
      const stream = response.data;
      stream.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        // console.log(prettyBytes(downloadedBytes));
        zip.write(Buffer.from(chunk));
        pubsub.publish(
          UPLOAD_PROGRESS,
          {
            uploadProgress:
            {
              size: prettyBytes(downloadedBytes),
              id: user.id,
            },
          },
        );
      });
      stream.on('end', () => {
        zip.end();
      });
    });

    return user;
  },
);
