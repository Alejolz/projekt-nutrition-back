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
      'SELECT id, user_id, current_step, step_data, created_at, updated_at FROM user_states WHERE user_id = $1',
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
    console.error('❌ Error obteniendo estado del usuario:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Establece/actualiza el estado del usuario
 * Normaliza el userId removiendo el código de país (+57)
 */
async function setUserState(userId, step, stepData = {}) {
  try {
    // Normalizar userId: remover +57 si existe
    const normalizedUserId = userId.replace(/^\+57/, '');
    
    const stepDataJson = JSON.stringify(stepData);

    // Verificar si el usuario ya existe
    const existing = await db.query('SELECT id FROM user_states WHERE user_id = $1', [normalizedUserId]);

    console.log('usuario', existing)

    if (existing.length > 0) {

      console.log(`📝 Intentando crear/actualizar user_state:`, {
      originalUserId: userId,
      normalizedUserId,
      step,
      stepData,
    });
      // Actualizar estado existente
      await db.query(
        'UPDATE user_states SET current_step = $1, step_data = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
        [step, stepDataJson, normalizedUserId]
      );
    } else {
      // Insertar nuevo estado
      console.log(`📝 Insertando nuevo user_state para: ${normalizedUserId}, step: ${step}`);
      await db.query(
        'INSERT INTO user_states (user_id, current_step, step_data) VALUES ($1, $2, $3)',
        [normalizedUserId, step, stepDataJson]
      );
    }

    // Retornar el estado actualizado
    // return getUserState(normalizedUserId);
  } catch (error) {
    console.error('Error estableciendo estado del usuario:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Inicializa el estado del usuario en el menú principal
 */
async function initializeUser(userId) {
  try {
    return await setUserState(userId, 'main_menu', {});
  } catch (error) {
    console.error('Error inicializando usuario:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Elimina el estado del usuario (cuando cierre sesión)
 */
async function clearUserState(userId) {
  try {
    await db.query('DELETE FROM user_states WHERE user_id = $1', [userId]);
    return true;
  } catch (error) {
    console.error('Error limpiando estado del usuario:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Obtiene todos los usuarios activos con un estado específico
 */
async function getUsersByStep(step) {
  try {
    const results = await db.query(
      'SELECT user_id, current_step, step_data FROM user_states WHERE current_step = $1',
      [step]
    );

    return results.map(row => ({
      userId: row.user_id,
      step: row.current_step,
      stepData: row.step_data ? JSON.parse(row.step_data) : {},
    }));
  } catch (error) {
    console.error('Error obteniendo usuarios con step:', JSON.stringify(error, null, 2));
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
    console.error('Error obteniendo estadísticas:', JSON.stringify(error, null, 2));
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
