import { SEND_CONTACT_FORM } from '../services/sendinblue';

// eslint-disable-next-line import/prefer-default-export
export const Contact = (parent, args) => {
  try {
    SEND_CONTACT_FORM(args.email, args.subject, args.message);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};
