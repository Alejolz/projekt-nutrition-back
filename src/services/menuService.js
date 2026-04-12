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
       WHERE key_name = $1 AND is_active = TRUE`,
      [keyName]
    );

    if (results.length === 0) {
      console.warn(`⚠️ Menú no encontrado: ${keyName}`);
      return null;
    }

    console.log('resultados', results)
    console.log('opciones', results[0].options)

    const menu = results[0];
    return {
      id: menu.id,
      keyName: menu.key_name,
      title: menu.title,
      description: menu.description,
      options: menu.options || [],
      actionType: menu.action_type || 'navigate',
    };
  } catch (error) {
    console.error('❌ Error obteniendo menú:', JSON.stringify({
      message: error?.message || String(error),
      code: error?.code,
      stack: error?.stack,
    }, null, 2));
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

  if (menu.description) {
    text += `${menu.description}\n`;
  }

  if (menu.options && menu.options.length > 0) {
    text += '\n';
    menu.options.forEach((option) => {
      text += `${option.option}️⃣ ${option.text}\n`;
    });
    text += '\nResponde con el número de tu opción 👇';
  }

  return text;
}

function validateMenuResponse(menu, userInput) {
  if (!menu || !menu.options) return null;

  const response = userInput.trim();

  // Validar por número (1, 2, 3...)
  const selectedOption = menu.options.find(opt => opt.option === response);
  
  if (selectedOption) {
    return {
      index: menu.options.indexOf(selectedOption),
      option: selectedOption,
    };
  }

  // Validar por texto exacto (case-insensitive)
  const selectedByText = menu.options.find(
    opt => opt.text.toLowerCase().includes(response.toLowerCase())
  );

  if (selectedByText) {
    return {
      index: menu.options.indexOf(selectedByText),
      option: selectedByText,
    };
  }

  return null;
}

module.exports = {
  getMenu,
  formatMenuForWhatsApp,
  validateMenuResponse,
};
