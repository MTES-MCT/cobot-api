module.exports = {
  name: 'CC-API',
  version: '0.1.0',
  env: process.env.NODE_ENV || 'development',
  host: process.env.HOST || 'localhost',
  port: process.env.PORT || 4000,
  website_url: 'http://co-construisons.beta.gouv.fr',
  database: {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
  },
};
