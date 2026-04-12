const { sendText } = require('../services/whatsappService');
const { responderIA } = require('../services/aiService');
const {
  getUserState,
  setUserState,
  initializeUser,
} = require('../services/userStateService');
const {
  getMenu,
  formatMenuForWhatsApp,
  validateMenuResponse,
} = require('../services/menuService');

/**
 * Handlers de acciones
 * Cada acción ejecuta su lógica específica
 */
const actionHandlers = {
  // Acción por defecto: solo navega entre menús
  navigate: async (userId, message, menu) => {
    return null; // No hace nada aquí, la navegación se maneja en handleIncomingMessage
  },

  // Chat con IA
  chat: async (userId, message, menu) => {
    const response = await responderIA(message);
    await sendText(userId, response);
    return { type: 'chat', response };
  },

  // Búsqueda de recetas (placeholder)
  recipe: async (userId, message, menu) => {
    // TODO: Implementar búsqueda de recetas
    await sendText(userId, 'Funcionalidad de recetas en construcción 🔧');
    return { type: 'recipe' };
  },

  // Gestión de perfil (placeholder)
  profile: async (userId, message, menu) => {
    // TODO: Implementar gestión de perfil
    await sendText(userId, 'Gestión de perfil en construcción 🔧');
    return { type: 'profile' };
  },
};

/**
 * Ejecuta una acción según su tipo
 */
async function executeAction(actionType, userId, message, menu) {
  const handler = actionHandlers[actionType];

  if (!handler) {
    console.warn(`⚠️ Handler no encontrado para acción: ${actionType}`);
    return null;
  }

  return await handler(userId, message, menu);
}

/**
 * Maneja mensajes entrantes de WhatsApp
 * Flujo: obtener estado → ejecutar acción → cambiar menú
 */
async function handleIncomingMessage(body) {
  const from = body.From.replace('whatsapp:', '');
  const message = body.Body?.trim();

  if (!message) return;

  try {
    // 1. Obtener estado del usuario
    let userState = await getUserState(from);

    // Si es primer mensaje, inicializar en menú principal
    if (!userState) {
      await initializeUser(from);
      
      // Enviar mensaje de bienvenida
      const welcomeMessage = `Hola! 🖐️ Soy NutriBot 🤖, tu asistente virtual de nutrición\nGracias por contactarte conmigo 😊

🌟 ¡Quiero contarte algo genial! Ahora podrás hablar conmigo de manera más fácil y rápida.

Solo responde con el número de la opción que deseas elegir.`;
      
      await sendText(from, welcomeMessage);
      return showMenu(from, 'main_menu');
    }

    // 2. Obtener menú actual del usuario
    const currentMenu = await getMenu(userState.step);

    if (!currentMenu) {
      return sendText(from, '❌ Menú no disponible. Por favor intenta de nuevo.');
    }

    // 3. SI ESTÁ EN UNA ACCIÓN (no navegación): Volver al menú principal
    // Esto evita repetir la acción si el usuario vuelve después de tiempo
    if (currentMenu.actionType !== 'navigate') {
      // Estaba en chat, recipe o profile - mostrar menú principal
      await sendText(from, '¿En qué más puedo ayudarte? 😊');
      await setUserState(from, 'main_menu', {});
      return showMenu(from, 'main_menu');
    }

    // 4. Validar si la respuesta es una opción válida del menú
    const validOption = validateMenuResponse(currentMenu, message);

    if (!validOption) {
      // "No te he entendido" + repetir el menú actual
      await sendText(from, 'Perdón, no entendí tu mensaje 😅\n\nIntenta de nuevo:');
      return showMenu(from, userState.step);
    }

    // 5. Obtener siguiente menú
    const { option } = validOption;
    const nextMenuKey = option.next;
    const nextMenu = await getMenu(nextMenuKey);

    if (!nextMenu) {
      await sendText(from, '❌ Menú no disponible.');
      return showMenu(from, userState.step);

    }

    // 6. Ejecutar acción según tipo
    const actionType = nextMenu.actionType || 'navigate';
    await executeAction(actionType, from, message, nextMenu);

    // 7. Actualizar estado del usuario
    await setUserState(from, nextMenuKey, {
      previousMenu: userState.step,
      selectedOption: option.text,
    });

    // 8. Si es navegación, mostrar el siguiente menú
    // Si es otra acción, el handler ya envió la respuesta
    if (actionType === 'navigate') {
      await showMenu(from, nextMenuKey);
    }

  } catch (error) {
    console.error('❌ Error manejando mensaje:', error);
    return sendText(from, '❌ Error procesando tu mensaje. Intenta de nuevo.');
  }
}

/**
 * Muestra un menú al usuario
 * @param {string} userId - ID del usuario (número WhatsApp)
 * @param {string} menuKey - Identificador del menú a mostrar
 */
async function showMenu(userId, menuKey) {
  try {
    const menu = await getMenu(menuKey);

    if (!menu) {
      return sendText(userId, '❌ Menú no disponible');
    }

    // Formatear y enviar el menú
    console.log(' Mostrando menú:', menu)
    const text = formatMenuForWhatsApp(menu);
    console.log (' Menu formateado para WhatsApp:\n', text);
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