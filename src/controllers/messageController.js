const { sendText } = require('../services/whatsappService');
const { responderIA, analizarImagen} = require('../services/aiService');
const {
  getUserState,
  setUserState,
  initializeUser,
  clearUserState,
} = require('../services/userStateService');
const { getUserProfile } = require('../services/profileService');
const {
  getMenu,
  formatMenuForWhatsApp,
  validateMenuResponse,
} = require('../services/menuService');

/**
 * Extrae los datos multimedia del body de Twilio
 * Retorna null si no hay imagen adjunta
 */
function extractImageFromBody(body) {
  const numMedia = parseInt(body.NumMedia || '0');
  if (numMedia === 0) return null;

  return {
    url: body.MediaUrl0,
    contentType: body.MediaContentType0 || 'image/jpeg',
  };
}

/**
 * Handlers de acciones — cada acción define su bienvenida (onEnter) y su lógica (onMessage)
 */
const actionHandlers = {
  chat: {
    onEnter: async (userId, menu) => {
      await sendText(userId, '¡Perfecto! 😊 Ahora puedes escribirme libremente sobre nutrición.\n\n¿Cuál es tu pregunta? 📝');
      await setUserState(userId, menu.keyName, {
        previousMenu: menu.keyName,
        chatReady: false,
      });
    },
    onMessage: async (userId, message, menu, userState) => {
      console.log('estado chat', userState);

      if (!userState.chatReady) {
        const response = await responderIA(message);
        await sendText(userId, response);
        await setUserState(userId, menu.keyName, {
          ...userState,
          chatReady: true,
        });
        return showMenu(userId, menu.keyName);
      }

      const validOption = validateMenuResponse(menu, message);

      if (validOption) {
        const { option } = validOption;

        if (!option.next) {
          await setUserState(userId, menu.keyName, {
            ...userState,
            chatReady: false,
          });
          await sendText(userId, '¡Perfecto! ¿Cuál es tu siguiente pregunta? 📝');
          return;
        }

        const nextMenu = await getMenu(option.next);
        if (!nextMenu) {
          await sendText(userId, '❌ Menú no disponible.');
          return showMenu(userId, menu.keyName);
        }

        await setUserState(userId, option.next, { previousMenu: menu.keyName });
        return showMenu(userId, option.next);
      }

      await sendText(userId, 'Perdón, no entendí tu mensaje 😅\n\nIntenta de nuevo:');
      return showMenu(userId, menu.keyName);
    },
  },

  analizar_imagen: {
    onEnter: async (userId, menu) => {
      await sendText(
        userId,
        '📸 ¡Genial! Envíame una foto de tu plato o alimento y lo analizaré por ti.\n\nPuedes incluir un mensaje describiendo el contexto si lo deseas.'
      );
      await setUserState(userId, menu.keyName, {
        previousMenu: menu.keyName,
        imageReady: false, // aún no ha recibido respuesta del análisis
      });
    },
    onMessage: async (userId, message, menu, userState, imageData) => {
      console.log('estado analizar_imagen', userState);

      // --- Paso 1: Esperando imagen → aún no ha recibido respuesta ---
      if (!userState.imageReady) {
        if (!imageData) {
          // El usuario escribió texto en vez de enviar imagen
          await sendText(
            userId,
            '😊 Para analizar necesito que me envíes una *foto* de tu alimento o plato.\n\n📸 Por favor adjunta una imagen.'
          );
          return;
        }

        // Recibió imagen → analizarla con la IA
        await sendText(userId, '🔍 Analizando tu imagen, un momento...');

        const caption = message || '';
        const response = await analizarImagen(imageData.url, imageData.contentType, caption);

        await sendText(userId, response);
        await setUserState(userId, menu.keyName, {
          ...userState,
          imageReady: true,
        });

        // Mostrar mini-menú post-análisis
        return showMenu(userId, menu.keyName);
      }

      // --- Paso 2: Ya recibió el análisis → esperar selección del mini-menú ---
      const validOption = validateMenuResponse(menu, message);

      if (validOption) {
        const { option } = validOption;

        // Sin "next" = analizar otra imagen → resetear estado
        if (!option.next) {
          await setUserState(userId, menu.keyName, {
            ...userState,
            imageReady: false,
          });
          await sendText(
            userId,
            '📸 ¡Perfecto! Envíame otra foto y la analizo.'
          );
          return;
        }

        // Con "next" = navegar (ej: volver al menú principal)
        const nextMenu = await getMenu(option.next);
        if (!nextMenu) {
          await sendText(userId, '❌ Menú no disponible.');
          return showMenu(userId, menu.keyName);
        }

        await setUserState(userId, option.next, { previousMenu: menu.keyName });
        return showMenu(userId, option.next);
      }

      // No eligió opción válida → repetir mini-menú
      await sendText(userId, 'Perdón, no entendí tu mensaje 😅\n\nIntenta de nuevo:');
      return showMenu(userId, menu.keyName);
    },
  },

  recipe: {
    onEnter: async (userId, menu) => {
      await sendText(userId, 'Funcionalidad de recetas en construcción 🔧');
      await setUserState(userId, 'main_menu', { previousMenu: menu.keyName });
      await showMenu(userId, 'main_menu');
    },
    onMessage: async (userId, message, menu, userState) => {
      // TODO: procesar búsqueda de receta
    },
  },

  profile: {
    onEnter: async (userId, menu) => {
      await sendText(userId, 'Gestión de perfil en construcción 🔧');
      await setUserState(userId, 'main_menu', { previousMenu: menu.keyName });
      await showMenu(userId, 'main_menu');
    },
    onMessage: async (userId, message, menu, userState) => {
      // TODO: procesar gestión de perfil
    },
  },
};

async function enterAction(actionType, userId, menu) {
  const handler = actionHandlers[actionType];
  if (!handler) {
    console.warn(`⚠️ Handler no encontrado para acción: ${actionType}`);
    return;
  }
  return handler.onEnter(userId, menu);
}

async function processAction(actionType, userId, message, menu, userState, imageData) {
  const handler = actionHandlers[actionType];
  if (!handler) {
    console.warn(`⚠️ Handler no encontrado para acción: ${actionType}`);
    return;
  }
  return handler.onMessage(userId, message, menu, userState, imageData);
}

/**
 * Maneja mensajes entrantes de WhatsApp
 */
async function handleIncomingMessage(body) {
  const from = body.From.replace('whatsapp:', '');
  const normalizedUserId = from.replace(/^\+57/, '');
  const message = body.Body?.trim();

  // Extraer imagen si viene adjunta
  const imageData = extractImageFromBody(body);

  // Permitir mensajes sin texto si traen imagen
  if (!message && !imageData) return;

  try {
    // Comando especial para reiniciar estado (pruebas)
    if (message?.toLowerCase() === 'hard_reset_8080') {
      await clearUserState(normalizedUserId);
      await sendText(from, 'Estado reiniciado.');
      return;
    }

    // 1. Verificar que el usuario esté registrado (caché en memoria)
    const profile = await getUserProfile(from);
    if (!profile) {
      await sendText(from, `¡Hola! 👋 Somos *NutriBot*, un asistente virtual de nutrición personalizado.

Por ahora el acceso es solo para usuarios registrados. Si deseas unirte, contáctanos en soporte y te ayudamos con tu registro. 📩

🚀 Estamos trabajando para que pronto puedas suscribirte directamente desde aquí. ¡Gracias por tu interés!`);
      return;
    }

    // 2. Obtener estado del usuario
    const userState = await getUserState(from);

    // 3. Si es primer mensaje, inicializar
    if (!userState) {
      const firstName = profile.name ? profile.name.split(' ')[0] : null;
      const saludo = firstName ? `Hola, ${firstName}! 🖐️` : `Hola! 🖐️`;

      await initializeUser(from);
      const welcomeMessage = `${saludo} Soy NutriBot 🤖, tu asistente virtual de nutrición\nGracias por contactarte conmigo 😊

🌟 ¡Quiero contarte algo genial! Ahora podrás hablar conmigo de manera más fácil y rápida.

Solo responde con el número de la opción que deseas elegir.`;
      await sendText(from, welcomeMessage);
      return showMenu(from, 'main_menu');
    }

    // 3. Obtener menú actual
    const currentMenu = await getMenu(userState.step);
    if (!currentMenu) {
      return sendText(from, '❌ Menú no disponible. Por favor intenta de nuevo.');
    }

    // 4. Si el usuario ya está en una acción → delegar completamente al handler
    if (currentMenu.actionType !== 'navigate') {
      console.log(`usuario en acción ${currentMenu.actionType} y estado ${JSON.stringify(userState)}`);
      return processAction(currentMenu.actionType, from, message, currentMenu, userState.stepData, imageData);
    }

    // 5. Flujo normal de navegación — validar opción del menú actual
    const validOption = validateMenuResponse(currentMenu, message);
    if (!validOption) {
      await sendText(from, 'Perdón, no entendí tu mensaje 😅\n\nIntenta de nuevo:');
      return showMenu(from, userState.step);
    }

    // 6. Obtener siguiente menú
    const { option } = validOption;
    const nextMenu = await getMenu(option.next);
    if (!nextMenu) {
      await sendText(from, '❌ Menú no disponible.');
      return showMenu(from, userState.step);
    }

    // 7. Actualizar estado
    const actionType = nextMenu.actionType || 'navigate';
    await setUserState(from, option.next, {
      previousMenu: userState.step,
      selectedOption: option.text,
    });

    // 8. Navegación normal → mostrar siguiente menú
    if (actionType === 'navigate') {
      return showMenu(from, option.next);
    }

    return enterAction(actionType, from, nextMenu);

  } catch (error) {
    console.error('❌ Error manejando mensaje:', error);
    return sendText(from, '❌ Error procesando tu mensaje. Intenta de nuevo.');
  }
}

async function showMenu(userId, menuKey) {
  try {
    const menu = await getMenu(menuKey);
    if (!menu) {
      return sendText(userId, '❌ Menú no disponible');
    }
    const text = formatMenuForWhatsApp(menu);
    await sendText(userId, text);
  } catch (error) {
    console.error('❌ Error mostrando menú:', error);
    return sendText(userId, '❌ Error mostrando el menú. Intenta de nuevo.');
  }
}

module.exports = {
  handleIncomingMessage,
  showMenu,
};