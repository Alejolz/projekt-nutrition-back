require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    buttonsSid: process.env.BUTTONS_CONTENT_SID,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
