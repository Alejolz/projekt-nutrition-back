const axios = require('axios');
const config = require('../config/env');

const OPENAI_API_KEY = config.openai.apiKey;
const TWILIO_ACCOUNT_SID = config.twilio.accountSid;
const TWILIO_AUTH_TOKEN = config.twilio.authToken;

/**
 * Descarga una imagen desde una URL de Twilio y la convierte a base64.
 * Las URLs de Twilio son privadas y requieren autenticación básica.
 */
async function descargarImagenTwilio(imageUrl, contentType) {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    auth: {
      username: TWILIO_ACCOUNT_SID,
      password: TWILIO_AUTH_TOKEN,
    },
  });
  const base64 = Buffer.from(response.data, 'binary').toString('base64');
  const resolvedType = contentType || response.headers['content-type'] || 'image/jpeg';
  return `data:${resolvedType};base64,${base64}`;
}

/**
 * Responde una pregunta usando OpenAI
 */
async function responderIA(texto) {
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-5-2025-08-07',
        messages: [{ role: 'user', content: texto }],
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    console.error('Error con OpenAI:', err.response?.data || err.message);
    return 'Lo siento, hubo un error procesando tu mensaje.';
  }
}

/**
 * Analiza una imagen usando OpenAI Vision
 * @param {string} imageUrl    - URL de Twilio (body.MediaUrl0)
 * @param {string} contentType - MIME type (body.MediaContentType0)
 */
async function analizarImagen(imageUrl, contentType) {
  const dataUri = await descargarImagenTwilio(imageUrl, contentType);
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Eres un asistente de nutrición que analiza imágenes de comida.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: '¿Qué ves en esta imagen?' },
              { type: 'image_url', image_url: { url: dataUri, detail: 'auto' } },
            ],
          },
        ],
        max_tokens: 800,
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    console.error('Error con OpenAI (imagen):', err.response?.data || err.message);
    return 'No pude analizar la imagen, intenta de nuevo.';
  }
}

module.exports = {
  responderIA,
  analizarImagen,
};