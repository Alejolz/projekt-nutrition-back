/**
 * Servicio de perfil de usuario con caché en memoria.
 * Consulta la BD solo una vez por usuario mientras el servidor esté corriendo.
 */

const db = require('./database');

// Caché en memoria: userId normalizado → perfil del usuario (o null)
const profileCache = new Map();

/**
 * Obtiene el perfil del usuario desde caché o BD.
 * Retorna null si el usuario no existe en user_profiles.
 */
async function getUserProfile(userId) {
  const normalizedUserId = userId.replace(/^\+57/, '');

  if (profileCache.has(normalizedUserId)) {
    return profileCache.get(normalizedUserId);
  }

  try {
    const results = await db.query(
      'SELECT id, user_id, phone_number, name, status FROM user_profiles WHERE user_id = $1',
      [normalizedUserId]
    );

    const profile = results.length > 0 ? results[0] : null;
    profileCache.set(normalizedUserId, profile);
    return profile;
  } catch (error) {
    console.error('❌ Error obteniendo perfil del usuario:', JSON.stringify(error, null, 2));
    return null;
  }
}

/**
 * Invalida el caché de un usuario específico (útil si se actualiza el perfil).
 */
function invalidateProfileCache(userId) {
  const normalizedUserId = userId.replace(/^\+57/, '');
  profileCache.delete(normalizedUserId);
}

module.exports = {
  getUserProfile,
  invalidateProfileCache,
};
