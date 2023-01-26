import SibApiV3Sdk from 'sib-api-v3-sdk';

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;
const SbiTE = new SibApiV3Sdk.TransactionalEmailsApi();
const SbiSmptEmail = new SibApiV3Sdk.SendSmtpEmail();

const SEND_FORGOT_PASSWORD = async (email, pseudo, token) => {
  SbiSmptEmail.templateId = 144;
  SbiSmptEmail.to = [
    {
      email,
      name: pseudo,
    },
  ];
  SbiSmptEmail.params = {
    PSEUDO: pseudo,
    URLVALIDATION: `https://shoot.wawy.io?token=${token}`,
  };
  try {
    const results = await SbiTE.sendTransacEmail(SbiSmptEmail);
    console.log(results);
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  SEND_FORGOT_PASSWORD,
};
