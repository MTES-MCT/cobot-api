import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { execute, subscribe } from 'graphql';
import { graphiqlExpress, graphqlExpress } from 'graphql-server-express';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { makeExecutableSchema } from 'graphql-tools';
import path from 'path';
import multer from 'multer';
import cors from 'cors';
import rimraf from 'rimraf';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';

import { attachDirectives } from './directives';
import config from './config';
import Logger from './utils/logger';

import resolvers from './resolvers';

import typeDefs from './schemas';

import models from './models';
import controllers from './controllers';

const upload = multer({
  dest: (process.env.NODE_ENV === 'development') ? 'uploads/' : '../uploads/',
});

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

attachDirectives(schema);

const WS_GQL_PATH = '/subscriptions';
const app = express();
const server = createServer(app);
const router = express.Router();

// REST Route For Authentication : this route is not in GRAPHQL as
// Front-End authentication mecanism require a response in header.
router.post('/login', async (req, res) => {
  try {
    const auth = await controllers.Auth(req.body.email, req.body.password);
    res.set('Authorization', auth.token);
    res.send(200, { user: auth.user });
  } catch (error) {
    Logger.log('error', error);
    res.sendStatus(401);
  }
});

// Just for MVP, need to find a way to use GraphQL with authentifcation mecanism
router.get('/user', async (req, res) => {
  try {
    const user = await controllers.User(req);
    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      pseudo: user.pseudo,
      role: (user.projects[0]) ? user.projects[0].role : null,
      projects: user.projects,
    });
  } catch (error) {
    Logger.log('error', error);
    res.sendStatus(401);
  }
});

app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Origin', 'Authorization'],
  exposedHeaders: ['content-type', 'Origin', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use('/img', express.static(path.join(__dirname, '../uploads')));
// app.use(express.static('assets'));

app.use(bodyParser.json());
app.use('/auth', bodyParser.json(), router);
app.use(bodyParser.raw({ inflate: true, type: 'image/png' }));

app.use(
  '/graphiql',
  graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: `ws://${config.host}:${config.port}/subscriptions`,
  }),
);

app.post('/upload', upload.single('file'), async (req, res) => {
  controllers.moveFile('../../uploads/', `../../uploads/${req.body.projectId}`, req.file.filename, async (err) => {
    if (err) throw err;
    if (req.body.profil) {
      return res.status(201).send({ filename: req.file.filename });
    }
    const newDataset = await controllers.DataSet(req.body);
    return res.status(201).send(newDataset);
  });
});

app.post('/upload-label', upload.single('file'), async (req, res) => {
  controllers.moveFile('../../uploads/', `../../uploads/labels/${req.body.type}`, req.file.filename, async (err) => {
    if (err) throw err;
    return res.status(201).send({ type: req.body.type, filename: req.file.filename });
  });
});

app.get('/object-detections', async (req, res) => {
  try {
    const results = await controllers.ObjectDetection(req.query.photo);
    res.send(results.data);
  } catch (error) {
    Logger.log('error', error);
    res.sendStatus(401);
  }
});
// app.post('/dropbox', (req, res) => {
//   if (req.body.url && req.body.url.indexOf('dropbox') > -1) {
//     controllers.DataSetFromDropbox(req, (files => res.status(201).send(files)));
//   } else {
//     return res.status(400).send();
//   }
// });

app.get('/export', async (req, res) => {
  const exportResult = await controllers.ExportData(req, req.query);
  res.download(`${exportResult}.zip`, () => {
    fs.unlinkSync(`${exportResult}.zip`);
    rimraf(exportResult, () => { });
  });
});

app.post('/export-to-automl', async (req, res) => {
  const storage = new Storage();
  try {
    const results = await storage.getBuckets();
    const [buckets] = results;
    console.log('Buckets:');
    buckets.forEach((bucket) => {
      console.log(bucket.name);
    });
  } catch (err) {
    console.error('ERROR:', err);
  }
  return res.status(200).send('ok');
  // const storage = new Storage();
  // const bucket = storage.bucket('ia-garbage-build');
  // bucket.upload('/local/path/image.png', (err, file, apiResponse) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     console.log(file);
  //   }
  //   return res.status(200).send('ok');
  // });
});

app.get('/dataset-ttl', async (req, res) => {
  if (req.headers.authorization && req.headers.authorization === process.env.TTL_TOKEN) {
    const checkResult = await controllers.DatasetTtlChecker();
    res.send(200, checkResult);
  } else {
    res.sendStatus(401);
  }
});

app.put('/score', async (req, res) => {
  if (req.headers.authorization) {
    await controllers.UpdateUserScore(req.headers.authorization, req.body.segmentId);
    res.send(200);
  } else {
    res.sendStatus(401);
  }
});

app.use(
  '/graphql',
  bodyParser.json(),
  graphqlExpress(req => ({
    schema,
    debug: false,
    context: {
      models,
      req,
    },
  })),
);

server.listen(config.port, () => {
  Logger.log('info', 'Server %s is listening on port %s', config.name, config.port);
  SubscriptionServer.create(
    {
      execute,
      subscribe,
      schema,
    },
    {
      server,
      path: WS_GQL_PATH,
    },
  );
  Logger.log('info', 'API Subscriptions %s is now running on %s', config.name, `ws://${config.host}:${config.port}${WS_GQL_PATH}`);
});
