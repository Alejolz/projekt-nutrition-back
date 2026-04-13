const { sendText } = require('../services/whatsappService');
const { responderIA } = require('../services/aiService');
const {
  getUserState,
  setUserState,
  initializeUser,
  clearUserState
} = require('../services/userStateService');
const {
  getMenu,
  formatMenuForWhatsApp,
  validateMenuResponse,
} = require('../services/menuService');

/**
 * Handlers de acciones — cada acción define su bienvenida (onEnter) y su lógica (onMessage)
 */
const actionHandlers = {
  chat: {
    onEnter: async (userId, menu) => {
      await sendText(userId, '¡Perfecto! 😊 Ahora puedes escribirme libremente sobre nutrición.\n\n¿Cuál es tu pregunta? 📝');
      await setUserState(userId, menu.keyName, {
        previousMenu: menu.keyName,
        chatReady: false, // indica que el usuario aún no ha recibido respuesta de la IA
      });
    },
    onMessage: async (userId, message, menu, userState) => {
      // Si aún no ha recibido ninguna respuesta → todo va a la IA sin validar opciones
      console.log('estado chat', userState)
      if (!userState.chatReady) {
        const response = await responderIA(message);
        await sendText(userId, response);
        await setUserState(userId, menu.keyName, {
          ...userState,
          chatReady: true,
        });
        return showMenu(userId, menu.keyName);
      }

      // Ya vio el mini-menú → validar si eligió una opción
      const validOption = validateMenuResponse(menu, message);

      if (validOption) {
        const { option } = validOption;

        // Sin "next" = seguir hablando → resetear chatReady para la próxima pregunta
        if (!option.next) {
          await setUserState(userId, menu.keyName, {
            ...userState,
            chatReady: false,
          });
          await sendText(userId, '¡Perfecto! ¿Cuál es tu siguiente pregunta? 📝');
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
      // TODO: cuando esté implementado, mostrar bienvenida de recetas
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
      // TODO: cuando esté implementado, mostrar bienvenida de perfil
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

async function processAction(actionType, userId, message, menu, userState) {
  const handler = actionHandlers[actionType];
  if (!handler) {
    console.warn(`⚠️ Handler no encontrado para acción: ${actionType}`);
    return;
  }
  return handler.onMessage(userId, message, menu, userState);
}

/**
 * Maneja mensajes entrantes de WhatsApp
 */
async function handleIncomingMessage(body) {
  const from = body.From.replace('whatsapp:', '');
  const normalizedUserId = from.replace(/^\+57/, '');
  const message = body.Body?.trim();

  if (!message) return;

  try {
    // Comando especial para reiniciar estado (pruebas)
    if (message.toLowerCase() === 'hard_reset_8080') {
      await clearUserState(normalizedUserId);
      await sendText(from, 'Estado reiniciado. Volviendo al menú principal.');
      return showMenu(from, 'main_menu');
    }

    // 1. Obtener estado del usuario
    const userState = await getUserState(from);

    // 2. Si es primer mensaje, inicializar
    if (!userState) {
      await initializeUser(from);
      const welcomeMessage = `Hola! 🖐️ Soy NutriBot 🤖, tu asistente virtual de nutrición\nGracias por contactarte conmigo 😊

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
      return processAction(currentMenu.actionType, from, message, currentMenu, userState.stepData);
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