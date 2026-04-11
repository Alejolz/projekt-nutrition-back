const { sendText } = require('../services/whatsappService');
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
 * Maneja mensajes entrantes de WhatsApp
 * Flujo: obtener estado → validar opción → mostrar siguiente menú
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
      return showMenu(from, 'main_menu');
    }

    // 2. Obtener menú actual del usuario
    const currentMenu = await getMenu(userState.step);

    if (!currentMenu) {
      return sendText(from, '❌ Menú no disponible. Por favor intenta de nuevo.');
    }

    // 3. Validar si la respuesta es válida
    const validOption = validateMenuResponse(currentMenu, message);

    if (!validOption) {
      return sendText(
        from,
        `❌ Opción no válida.\n\nResponde con el número (1, 2, 3...) de tu opción`
      );
    }

    // 4. Obtener siguiente menú
    const { option } = validOption;
    const nextMenuKey = option.next_menu;

    // 5. Actualizar estado del usuario
    await setUserState(from, nextMenuKey, {
      previousMenu: userState.step,
      selectedOption: option.label,
    });

    // 6. Mostrar siguiente menú
    await showMenu(from, nextMenuKey);

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