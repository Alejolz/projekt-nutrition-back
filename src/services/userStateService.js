/**
 * Servicio para gestionar el estado de los usuarios
 * Almacena el estado en memoria (para desarrollo)
 * TODO: Usar base de datos en producción
 */
const userState = {};

/**
 * Obtiene el estado del usuario
 */
function getUserState(userId) {
  return userState[userId];
}

/**
 * Establece el estado del usuario
 */
function setUserState(userId, state) {
  userState[userId] = state;
  return userState[userId];
}

/**
 * Inicializa el estado en menú principal
 */
function initializeUser(userId) {
  userState[userId] = { step: 'menu', createdAt: new Date() };
  return userState[userId];
}

/**
 * Limpia el estado del usuario
 */
function clearUserState(userId) {
  delete userState[userId];
}

module.exports = {
  getUserState,
  setUserState,
  initializeUser,
  clearUserState,
};
