/**
 * Servicio para gestionar el estado de los usuarios en la BD
 * Reemplaza la versión antigua en memoria
 */

const db = require('./database');

/**
 * Obtiene el estado del usuario desde la BD
 */
async function getUserState(userId) {
  try {
    const results = await db.query(
      'SELECT id, user_id, current_step, step_data, created_at, updated_at FROM user_states WHERE user_id = ?',
      [userId]
    );

    if (results.length === 0) {
      return null;
    }

    const userState = results[0];
    return {
      id: userState.id,
      userId: userState.user_id,
      step: userState.current_step,
      stepData: userState.step_data ? JSON.parse(userState.step_data) : {},
      createdAt: userState.created_at,
      updatedAt: userState.updated_at,
    };
  } catch (error) {
    console.error('Error obteniendo estado del usuario:', error);
    throw error;
  }
}

/**
 * Establece/actualiza el estado del usuario
 */
async function setUserState(userId, step, stepData = {}) {
  try {
    const stepDataJson = JSON.stringify(stepData);

    // Verificar si el usuario ya existe
    const existing = await db.query('SELECT id FROM user_states WHERE user_id = ?', [userId]);

    if (existing.length > 0) {
      // Actualizar estado existente
      await db.query(
        'UPDATE user_states SET current_step = ?, step_data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [step, stepDataJson, userId]
      );
    } else {
      // Insertar nuevo estado
      await db.query(
        'INSERT INTO user_states (user_id, current_step, step_data) VALUES (?, ?, ?)',
        [userId, step, stepDataJson]
      );
    }

    // Retornar el estado actualizado
    return getUserState(userId);
  } catch (error) {
    console.error('Error estableciendo estado del usuario:', error);
    throw error;
  }
}

/**
 * Inicializa el estado del usuario en el menú principal
 */
async function initializeUser(userId) {
  try {
    return await setUserState(userId, 'menu', {});
  } catch (error) {
    console.error('Error inicializando usuario:', error);
    throw error;
  }
}

/**
 * Elimina el estado del usuario (cuando cierre sesión)
 */
async function clearUserState(userId) {
  try {
    await db.query('DELETE FROM user_states WHERE user_id = ?', [userId]);
    return true;
  } catch (error) {
    console.error('Error limpiando estado del usuario:', error);
    throw error;
  }
}

/**
 * Obtiene todos los usuarios activos con un estado específico
 */
async function getUsersByStep(step) {
  try {
    const results = await db.query(
      'SELECT user_id, current_step, step_data FROM user_states WHERE current_step = ?',
      [step]
    );

    return results.map(row => ({
      userId: row.user_id,
      step: row.current_step,
      stepData: row.step_data ? JSON.parse(row.step_data) : {},
    }));
  } catch (error) {
    console.error('Error obteniendo usuarios con step:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de usuarios
 */
async function getUserStats() {
  try {
    const results = await db.query(`
      SELECT current_step, COUNT(*) as count
      FROM user_states
      GROUP BY current_step
    `);

    return results;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    throw error;
  }
}

module.exports = {
  getUserState,
  setUserState,
  initializeUser,
  clearUserState,
  getUsersByStep,
  getUserStats,
};
