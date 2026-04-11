const mysql = require('mysql2/promise');
const config = require('../config/env');

let pool = null;

/**
 * Inicializa el pool de conexiones a MySQL
 */
async function initializePool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log('✅ Pool de conexiones MySQL inicializado');
  return pool;
}

/**
 * Obtiene una conexión del pool
 */
async function getConnection() {
  if (!pool) {
    await initializePool();
  }
  return pool.getConnection();
}

/**
 * Ejecuta una query
 */
async function query(sql, values = []) {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(sql, values);
    return results;
  } finally {
    connection.release();
  }
}

/**
 * Cierra el pool de conexiones
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('❌ Pool de conexiones MySQL cerrado');
  }
}

module.exports = {
  initializePool,
  getConnection,
  query,
  closePool,
};
