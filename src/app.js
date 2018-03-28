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

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

attachDirectives(schema);

const app = express();

app.use(cors('*'));

app.use(express.static('assets'));

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
