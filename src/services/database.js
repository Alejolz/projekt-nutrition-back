const { Pool } = require('pg');
const config = require('../config/env');

let pool = null;

/**
 * Inicializa el pool de conexiones a PostgreSQL
 */
async function initializePool() {
  if (pool) return pool;

  pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('❌ Error en pool PostgreSQL:', err);
  });

  console.log('✅ Pool de conexiones PostgreSQL inicializado');
  return pool;
}

/**
 * Obtiene una conexión del pool
 */
async function getConnection() {
  if (!pool) {
    await initializePool();
  }
  return pool.connect();
}

/**
 * Ejecuta una query
 */
async function query(sql, values = []) {
  const connection = await getConnection();
  try {
    const result = await connection.query(sql, values);
    return result.rows;
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
    console.log('❌ Pool de conexiones PostgreSQL cerrado');
  }
}

module.exports = {
  initializePool,
  getConnection,
  query,
  closePool,
};
