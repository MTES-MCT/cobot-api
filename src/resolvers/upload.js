/* eslint-disable import/prefer-default-export */
import axios from 'axios';
import prettyBytes from 'pretty-bytes';
import eachOfSeries from 'async/eachOfSeries';
import exif from 'jpeg-exif';
import mv from 'mv';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import uuid from 'uuid/v1';

import { checkRoleAndResolve, pubsub, withFilter, UPLOAD_PROGRESS, ADMIN } from './common';
import { Unzip, Dms2Dec, DataSet } from '../controllers';

const pusblishProgress = (data, uid) => {
  pubsub.publish(
    UPLOAD_PROGRESS,
    {
      uploadProgress:
      {
        data,
        id: uid,
      },
    },
  );
};

export const uploadProgress = {
  subscribe: withFilter(
    () => pubsub.asyncIterator(UPLOAD_PROGRESS),
    (payload, variables) => payload.uploadProgress.id.toString() === variables.uid.toString(),
  ),
};

export const dropbox = (parent, args, { req }) => checkRoleAndResolve(
  req,
  ADMIN,
  async (user) => {
    const files = [];
    const fileName = uuid();
    const fileNameZip = `${fileName}.zip`;
    const uploadPath = path.join(__dirname, `../../uploads/${args.project.id}`);
    const filepathZip = path.join(uploadPath, fileNameZip);
    const filepath = path.join(uploadPath, fileName);
    const zip = fs.createWriteStream(filepathZip);
    const options = {
      responseType: 'stream',
    };

    const context = {
      projectId: args.project.id,
      projectName: args.project.name,
      question: args.project.question,
      answers: args.project.answers,
      metadata: {
        geoData: null,
        raw: null,
      },
    };

    try {
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath);
      }
    } catch (err) {
      if (err) { throw err; }
    }

    let downloadedBytes = 0;
    const res = await axios.get(args.url, options)
      .then((response) => {
        if (response.headers['content-type'] === 'application/zip') {
          const stream = response.data;
          stream.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            zip.write(Buffer.from(chunk));
            pusblishProgress(`Téléchargement de ${prettyBytes(downloadedBytes)}`, user.id);
          });
          stream.on('end', () => {
            zip.end();
            pusblishProgress('Dossier récupéré', user.id);
            Unzip(filepathZip, filepath, () => {
              pusblishProgress('Dossier dezippé', user.id);
              fs.readdir(filepath, (readDirErr, items) => {
                if (readDirErr) { throw readDirErr; }
                eachOfSeries(items, (item, key, cb) => {
                  const metadata = exif.parseSync(`${filepath}/${item}`);
                  let dec = null;
                  if (metadata && metadata.GPSInfo) {
                    dec = Dms2Dec(metadata.GPSInfo);
                  }
                  mv(`${filepath}/${item}`, `${uploadPath}/${item}`, { mkdirp: true }, async (mvErr) => {
                    if (mvErr) throw mvErr;
                    files.push(item);
                    if (dec) {
                      context.metadata = {
                        geoData: {
                          location: {
                            coordinates: dec,
                            type: 'Point',
                          },
                        },
                        raw: metadata,
                      };
                    }
                    context.file = {
                      filename: item,
                    };
                    await DataSet(context);
                    pusblishProgress(`Traitement de la photo ${key}/${items.length}`, user.id);
                    return cb();
                  });
                }, (seriesErr) => {
                  if (seriesErr) { throw seriesErr; }
                  rimraf.sync(filepath);
                  rimraf.sync(filepathZip);
                  pusblishProgress('eot', user.id);
                });
              });
            });
          });
          return 'ok';
        }
        return 'ko';
      })
      .catch(error => JSON.stringify(error));
    return res;
  },
);
