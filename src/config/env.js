require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    buttonsSid: process.env.BUTTONS_CONTENT_SID,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'nutribot',
  },
};

module.exports = config;
