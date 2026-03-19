const { sendText, sendButtons } = require('../services/whatsappService');
const { responderIA } = require('../services/aiService');
const {
  getUserState,
  setUserState,
  initializeUser,
} = require('../services/userStateService');
const { set } = require('../app');

/**
 * Maneja mensajes entrantes de WhatsApp
 */
async function handleIncomingMessage(body) {
  const from = body.From.replace('whatsapp:', '');
  const message = body.Body?.trim();

  if (!message) return;

  let userState = getUserState(from);

  // Si no hay estado, inicializar
  if (!userState) {
    initializeUser(from);
    return sendText(
      from,
      `👋 ¡Hola!\n\n` +
        `¿Qué quieres hacer?\n\n` +
        `1️⃣ 📸 Hablar con IA\n` +
        `2️⃣ 🍽️ Pedir una receta\n` +
        `3️⃣ 👤 Gestión de perfil\n\n` +
        `Responde con el número de la opción 👇`
    );
  }

  // Si está en el menú
  if (userState.step === 'menu') {
    if (message === '1') {
      setUserState(from, { step: 'ia' });
      return sendText(
        from,
        `🤖 Modo IA activado\n\n` +
          `Escribe lo que quieras preguntar sobre nutrición, recetas o salud.`
      );
    }

    if (message === '2') {
      setUserState(from, { step: 'recipe' });
      return sendText(
        from,
        `🍽️ Modo Recetas activado\n\n` +
          `¿Qué tipo de receta buscas? (ej: ensalada, pollo, postre)`
      );
    }

    if (message === '3') {
      setUserState(from, { step: 'profile' });
      return sendText(
        from,
        `👤 Gestión de perfil\n\n` +
          `Opción aún en desarrollo. Vuelve pronto.`
      );
    }

    return sendText(
      from,
      `❌ Opción no válida\n\nResponde con *1*, *2* o *3* para elegir una opción.`
    );
  }

  // Si está hablando con la IA
  if (userState.step === 'ia') {
    // Manejar respuesta a los botones
    if (message === 'Volver al menú') {
      setUserState(from, { step: 'menu' });
      return sendText(
        from,
        `¿Qué quieres hacer?\n\n` +
          `1️⃣ 📸 Hablar con IA\n` +
          `2️⃣ 🍽️ Pedir una receta\n` +
          `3️⃣ 👤 Gestión de perfil\n\n` +
          `Responde con el número de la opción 👇`
      );
    }

    // Si presiona "Seguir hablando", no hacer nada especial, simplemente pedir la pregunta
    if (message === 'Seguir hablando') {
      return sendText(from, `🤖 Escribe tu pregunta y te respondo.`);
    }

    const respuesta = await responderIA(message);
    await sendText(from, respuesta);
    return sendButtons(from, 'Volver al menú', 'Seguir hablando');
  }

  // Si está en modo recetas
  if (userState.step === 'recipe') {
    // Manejar respuesta a los botones
    if (message === 'Volver al menú') {
      setUserState(from, { step: 'menu' });
      return sendText(
        from,
        `¿Qué quieres hacer?\n\n` +
          `1️⃣ 📸 Hablar con IA\n` +
          `2️⃣ 🍽️ Pedir una receta\n` +
          `3️⃣ 👤 Gestión de perfil\n\n` +
          `Responde con el número de la opción 👇`
      );
    }

    // Si presiona "Otra receta", no hacer nada especial, simplemente pedir el ingrediente
    if (message === 'Otra receta') {
      return sendText(from, `🍽️ ¿Qué receta quieres ahora? (ej: ensalada, pollo, postre)`);
    }

    const respuesta = await responderIA(
      `Dame una receta de ${message} que sea fácil y saludable`
    );
    await sendText(from, respuesta);
    return sendButtons(from, 'Volver al menú', 'Otra receta');
  }

  // Menú por defecto
  return sendText(from, `Opción no reconocida. Responde con *1*, *2* o *3*.`);
}

module.exports = {
  handleIncomingMessage,
};