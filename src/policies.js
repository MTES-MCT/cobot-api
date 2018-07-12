import jwt from 'jsonwebtoken';
import Logger from './utils/logger';
import { AuthorizationError } from './utils/error';

const checkAuthAndResolve = (context, controller) => {
  const token = context.headers.authorization;
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
    return controller.apply(this, [decoded]);
  } catch (error) {
    throw new AuthorizationError({
      message: 'Bad token',
    });
  }
};

const checkRoleAndResolve = (
  context,
  expectedRole,
  controller,
  ...params
) => {
  const token = context.headers.authorization;
  if (!token) {
    Logger.log('error', 'A user try to connect without supply a JWT for authorization');
    throw new AuthorizationError({
      message: 'You must supply a JWT for authorization!',
    });
  }
  const decoded = jwt.verify(
    token.replace('Bearer ', ''),
    process.env.JWT_SECRET,
  );

  const { role } = decoded;
  if (!role) {
    Logger.log('error', 'A user try to connect without any role');
    throw new AuthorizationError({
      message: 'You must have a defined role!',
    });
  }
  if (role && role >= expectedRole) {
    return controller.apply(this, params);
  }
  Logger.log('error', 'A user try to access a method without enough right');
  throw new AuthorizationError({
    message: 'You are not authorized.',
  });
};

module.exports = { checkAuthAndResolve, checkRoleAndResolve };
