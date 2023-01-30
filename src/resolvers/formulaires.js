import { checkAuthAndResolve } from './common';
import { SEND_CONTACT_FORM } from '../services/sendinblue';

// eslint-disable-next-line import/prefer-default-export
export const Contact = (parent, args, { models, req }) => checkAuthAndResolve(
  req,
  async (token) => {
    try {
      const user = await models.Users.findById(token.id);
      if (user) {
        console.log(user.email, user.pseudo, args.subject, args.message);
        SEND_CONTACT_FORM(user.email, user.pseudo, args.subject, args.message);
        return true;
      }
      return false;
    } catch (e) {
      console.log(e);
      return false;
    }
  },
);
