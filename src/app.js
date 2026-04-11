const express = require('express');
const config = require('./config/env');
const webhookRoutes = require('./routes/webhook');
const { initializePool } = require('./services/database');

const app = express();

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Inicializar pool de BD al arrancar
let dbReady = false;
initializePool()
  .then(() => {
    dbReady = true;
  })
  .catch(error => {
    console.error('Error inicializando BD:', error);
  });

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: dbReady ? 'OK' : 'BD no lista',
    timestamp: new Date().toISOString(),
    database: dbReady ? 'Conectado' : 'Desconectado',
  });
});

// Rutas
app.use('/', webhookRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
