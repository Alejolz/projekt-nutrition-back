const twilio = require('twilio');
const config = require('../config/env');

const client = twilio(
  config.twilio.accountSid,
  config.twilio.authToken
);

/**
 * Envía un mensaje de texto por WhatsApp
 */
async function sendText(to, message) {
  return client.messages.create({
    from: `whatsapp:${config.twilio.whatsappNumber}`,
    to: `whatsapp:${to}`,
    body: message,
  });
}

/**
 * Envía botones interactivos por WhatsApp
 */
async function sendButtons(to, button1, button2) {
  return client.messages.create({
    from: `whatsapp:${config.twilio.whatsappNumber}`,
    to: `whatsapp:${to}`,
    contentSid: config.twilio.buttonsSid,
    contentVariables: JSON.stringify({
      '1': button1,
      '2': button2,
      '3': 'Seleccione una opción',
    }),
  });
}

module.exports = {
  sendText,
  sendButtons,
};
