import express from 'express';
import bodyParser from 'body-parser';
import { graphiqlExpress, graphqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import cors from 'cors';
import { attachDirectives } from './directives';
import config from './config';
import Logger from './utils/logger';

import typeDefs from './schema';
import resolvers from './resolvers';
import models from './models';
import controllers from './controllers';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

attachDirectives(schema);

const app = express();
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
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['content-type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(express.static('assets'));

app.use('/auth', bodyParser.json(), router);

app.use(
  '/graphiql',
  graphiqlExpress({
    endpointURL: '/graphql',
  }),
);

app.use(
  '/graphql',
  bodyParser.json(),
  graphqlExpress(req => ({
    schema,
    context: {
      models,
      req,
    },
  })),
);

app.listen(config.port);

Logger.log('info', 'Server %s is listening on port %s', config.name, config.port);
