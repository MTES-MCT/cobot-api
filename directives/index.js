// credit @chenkie https://github.com/chenkie/graphql-auth/blob/master/directives/index.js
import { forEachField } from 'graphql-tools';
import { getArgumentValues } from 'graphql/execution/values';
import jwt from 'jsonwebtoken';
import Logger from '../utils/logger';
import { AuthorizationError } from '../utils/error';

const directiveResolvers = {
  isAuthenticated(result, source, args, context) {
    const token = context.headers.authorization;
    if (!token) {
      Logger.log('error', 'A user try to connect without supply a JWT for authorization');
      throw new AuthorizationError({
        message: 'You must supply a JWT for authorization!',
      });
    }
    try {
      jwt.verify(
        token.replace('Bearer ', ''),
        process.env.JWT_SECRET,
      );
      return result;
    } catch (err) {
      Logger.log('error', 'A user try to connect with an invalid token');
      return 'You are not authorized.';
    }
  },

  hasRole(result, source, args, context) {
    const token = context.headers.authorization;
    const expectedRole = args.role;
    if (!token) {
      Logger.log('error', 'A user try to connect without supply a JWT for authorization');
      throw new AuthorizationError({
        message: 'You must supply a JWT for authorization!',
      });
    }
    try {
      const decoded = jwt.verify(
        token.replace('Bearer ', ''),
        process.env.JWT_SECRET,
      );
      if (decoded.role >= expectedRole) {
        return result;
      }
    } catch (err) {
      return Promise.reject(new Error('You must supply a JWT for authorization!'));
    }
  },
};

// Credit: agonbina https://github.com/apollographql/graphql-tools/issues/212
const attachDirectives = (schema) => {
  forEachField(schema, (field) => {
    const { directives } = field.astNode;
    directives.forEach((directive) => {
      const directiveName = directive.name.value;
      const resolver = directiveResolvers[directiveName];

      if (resolver) {
        const oldResolve = field.resolve;
        const Directive = schema.getDirective(directiveName);
        const args = getArgumentValues(Directive, directive);

        field.resolve = () => {
          const [source, _, context, info] = arguments;
          let promise = oldResolve.call(field, ...arguments);
          const isPrimitive = !(promise instanceof Promise);
          if (isPrimitive) {
            promise = Promise.resolve(promise);
          }
          return promise.then(result => resolver(result, source, args, context, info));
        };
      }
    });
  });
};

module.exports = { directiveResolvers, attachDirectives };
