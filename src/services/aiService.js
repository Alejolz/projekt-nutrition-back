const axios = require('axios');
const config = require('../config/env');

const OPENAI_API_KEY = config.openai.apiKey;

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
 */
async function analizarImagen(base64Imagen) {
  const dataUri = `data:image/jpeg;base64,${base64Imagen}`;
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-vision-preview',
        messages: [
          { role: 'system', content: 'Eres un asistente de nutrición que analiza imágenes de comida.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: '¿Qué ves en esta imagen?' },
              { type: 'image_url', image_url: { url: dataUri, alt_text: 'Imagen de usuario' } },
            ],
          },
        ],
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
