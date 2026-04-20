const axios = require('axios');
const config = require('../config/env');

const OPENAI_API_KEY = config.openai.apiKey;
const TWILIO_ACCOUNT_SID = config.twilio.accountSid;
const TWILIO_AUTH_TOKEN = config.twilio.authToken;

const MAX_INPUT_LENGTH = 1000;
const MAX_OUTPUT_LENGTH = 1000;

// Patrones de prompt injection comunes
const INJECTION_PATTERNS = [
  /ignora\s+(las\s+)?(instrucciones|anteriores|previas)/i,
  /ignore\s+(previous|prior|all|any)\s+instructions/i,
  /olvida\s+(lo\s+)?(anterior|todo|tus\s+instrucciones)/i,
  /forget\s+(everything|previous|prior|your\s+instructions)/i,
  /ahora\s+eres\s+/i,
  /now\s+you\s+are\s+/i,
  /act\s+as\s+(if\s+you\s+are\s+)?a\s+/i,
  /actúa\s+como\s+/i,
  /nuevo\s+rol\s*:/i,
  /new\s+role\s*:/i,
  /sistema\s*:\s*/i,
  /system\s*:\s*/i,
  /<\s*system\s*>/i,
  /\[system\]/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /modo\s+dan/i,
];

/**
 * Sanitiza el input del usuario antes de enviarlo a OpenAI.
 * Retorna null si el input es inválido o contiene inyección de prompt.
 */
function sanitizarInput(texto) {
  if (!texto || typeof texto !== 'string') return null;

  // Eliminar caracteres nulos y de control
  let sanitized = texto.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalizar espacios múltiples y recortar
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  if (sanitized.length === 0) return null;

  // Truncar al máximo permitido
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH);
  }

  // Detectar patrones de prompt injection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      return null;
    }
  }

  return sanitized;
}

const SYSTEM_PROMPT_CHAT = `Eres NutriBot, un asistente virtual experto en nutrición y alimentación saludable. Tu único propósito es responder preguntas relacionadas con:
- Nutrición, macronutrientes (proteínas, carbohidratos, grasas) y micronutrientes (vitaminas, minerales)
- Conteo de calorías y valor nutricional de alimentos
- Dietas saludables, planes alimenticios y hábitos nutricionales
- Alimentación para objetivos específicos (pérdida de peso, ganancia muscular, salud cardiovascular, etc.)
- Alimentos recomendados para condiciones de salud (diabetes, hipertensión, intolerancia al gluten, etc.)
- Recetas y preparaciones saludables
- Hidratación y su relación con la salud

Reglas estrictas:
1. Si el usuario hace una pregunta que NO está relacionada con nutrición o alimentación, responde exactamente: "Solo puedo ayudarte con preguntas sobre nutrición y alimentación. ¿Tienes alguna consulta nutricional? 🥦"
2. Basa tus respuestas en evidencia científica actualizada.
3. Para preguntas médicas específicas, recomienda siempre consultar a un profesional de la salud.
4. Responde en el mismo idioma que el usuario.
5. Sé conciso y claro, usa listas cuando sea útil.
6. Tu respuesta final nunca debe superar ${MAX_OUTPUT_LENGTH} caracteres.`;

const SYSTEM_PROMPT_IMAGEN = `Eres NutriBot Vision, un experto en análisis nutricional de alimentos a partir de imágenes. Tu único propósito es analizar fotos de alimentos, platos o bebidas y proporcionar:

1. **Identificación**: Qué alimentos o platos hay en la imagen.
2. **Calorías estimadas**: Calorías totales del plato y por cada componente (indicando que son estimaciones).
3. **Macronutrientes aproximados**: Proteínas (g), Carbohidratos (g) y Grasas (g).
4. **Evaluación nutricional**: Si el plato es saludable, qué aporta y qué podría mejorar.
5. **Tamaño de porción estimado**: Basado en lo visible en la imagen.

Reglas estrictas:
1. Si la imagen NO contiene alimentos, bebidas o comida, responde exactamente: "No puedo identificar alimentos en esta imagen. Por favor envíame una foto de un plato, alimento o bebida para analizarlo. 🥗"
2. Siempre aclara que los valores calóricos son estimaciones visuales y pueden variar según la preparación y tamaño exacto.
3. Si el usuario agrega contexto sobre el alimento en su mensaje, úsalo para mejorar el análisis.
4. Responde en el mismo idioma que el usuario.
5. Usa un formato claro con secciones, sin emojis para facilitar la lectura.
6. Tu respuesta final nunca debe superar ${MAX_OUTPUT_LENGTH} caracteres.`;

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
 * Responde una pregunta nutricional usando OpenAI
 */
async function responderIA(texto) {
  const inputLimpio = sanitizarInput(texto);
  if (!inputLimpio) {
    return 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo con una pregunta sobre nutrición.';
  }

  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_CHAT },
          { role: 'user', content: inputLimpio },
        ],
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
 * Analiza una imagen de alimento usando OpenAI Vision
 * @param {string} imageUrl    - URL de Twilio (body.MediaUrl0)
 * @param {string} contentType - MIME type (body.MediaContentType0)
 * @param {string} caption     - Texto enviado junto a la imagen por el usuario
 */
async function analizarImagen(imageUrl, contentType, caption) {
  const dataUri = await descargarImagenTwilio(imageUrl, contentType);

  const captionLimpio = caption ? sanitizarInput(caption) : null;
  const userText = captionLimpio
    ? `Analiza los alimentos de esta imagen. Contexto adicional del usuario: "${captionLimpio}"`
    : 'Analiza los alimentos de esta imagen.';

  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_IMAGEN },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: dataUri, detail: 'auto' } },
            ],
          },
        ],
        max_tokens: 900,
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    console.error('Error con OpenAI (imagen):', err.response?.data || err.message);
    return 'No pude analizar la imagen, intenta de nuevo.';
  }
}

async function obtenerReceta (texto) {
  const inputLimpio = sanitizarInput(texto);
  if (!inputLimpio) {
    return 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.';
  }
    try {
        const res = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-5-2025-08-07',
            messages: [
              { role: 'system', content: 'Eres un experto en recetas. Proporciona una receta detallada para un plato saludable, incluyendo ingredientes, cantidades y pasos de preparación.' },
              { role: 'user', content: inputLimpio},
            ],
          },    
          { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
        );
        return res.data.choices[0].message.content;
      } catch (err) {
        console.error('Error con OpenAI (receta):', err.response?.data || err.message);
        return 'No pude obtener la receta, intenta de nuevo.';
      } 
       

}

module.exports = {
  sanitizarInput,
  responderIA,
  analizarImagen,
  obtenerReceta,
};