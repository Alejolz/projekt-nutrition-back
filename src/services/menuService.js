/**
 * Servicio para gestionar menús desde la base de datos
 * Bot consume menús dinámicos - NO crea ni edita menús
 */

const db = require('./database');

/**
 * Obtiene un menú por su key_name
 * @param {string} keyName - Identificador único del menú
 * @returns {object} Menú con opciones y tipo de acción
 */
async function getMenu(keyName) {
  try {
    const results = await db.query(
      `SELECT id, key_name, title, description, options, action_type
       FROM menus 
       WHERE key_name = ? AND is_active = TRUE`,
      [keyName]
    );

    if (results.length === 0) {
      console.warn(`⚠️ Menú no encontrado: ${keyName}`);
      return null;
    }

    const menu = results[0];
    return {
      id: menu.id,
      keyName: menu.key_name,
      title: menu.title,
      description: menu.description,
      options: menu.options ? JSON.parse(menu.options) : [],
      actionType: menu.action_type || 'navigate',
    };
  } catch (error) {
    console.error('❌ Error obteniendo menú:', error);
    throw error;
  }
}

/**
 * Formatea un menú para enviar a WhatsApp
 * Formato: TITULO\nDESCRIPCION\n1️⃣ Opción 1\n2️⃣ Opción 2\n...
 */
function formatMenuForWhatsApp(menu) {
  if (!menu) return '❌ Menú no disponible';

  let text = '';

  if (menu.title) {
    text += `📋 *${menu.title}*\n`;
  }

  if (menu.description) {
    text += `\n${menu.description}\n`;
  }

  if (menu.options && menu.options.length > 0) {
    text += '\n';
    menu.options.forEach((option, index) => {
      text += `${index + 1}️⃣ ${option.label}\n`;
    });
    text += '\nResponde con el número de tu opción 👇';
  }

  return text;
}

function validateMenuResponse(menu, userInput) {
  if (!menu || !menu.options) return null;

  const response = userInput.trim();

  // Validar por número (1, 2, 3...)
  const optionIndex = parseInt(response) - 1;
  if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < menu.options.length) {
    return {
      index: optionIndex,
      option: menu.options[optionIndex],
    };
  }

  // Validar por label exacto (case-insensitive)
  const selectedOption = menu.options.find(
    opt => opt.label.toLowerCase() === response.toLowerCase()
  );

  if (selectedOption) {
    return {
      index: menu.options.indexOf(selectedOption),
      option: selectedOption,
    };
  }

  return null;
}

module.exports = {
  getMenu,
  formatMenuForWhatsApp,
  validateMenuResponse,
};
