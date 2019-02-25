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

import { attachDirectives } from './directives';
import config from './config';
import Logger from './utils/logger';

import typeDefs from './schema';
import resolvers from './resolvers';
import models from './models';
import controllers from './controllers';

const upload = multer({
  dest: 'uploads/',
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
    const token = await controllers.Auth(req.body.email, req.body.password);
    res.set('Authorization', token);
    res.sendStatus(200);
  } catch (error) {
    Logger.log('error', error);
    res.sendStatus(401);
  }
});

// Just for MVP, need to find a way to use GraphQL with authentifcation mecanism
router.get('/user', async (req, res) => {
  try {
    const user = await controllers.User(req);
    res.json({ email: user.email, name: user.name, role: user.role });
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
    const newDataset = await controllers.DataSet(req);
    return res.status(201).send(newDataset);
  });
});

app.post('/dropbox', (req, res) => {
  if (req.body.url && req.body.url.indexOf('dropbox') > -1) {
    controllers.DataSetFromDropbox(req, (files => res.status(201).send(files)));
  } else {
    return res.status(400).send();
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
