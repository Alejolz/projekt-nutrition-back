const express = require('express');
const config = require('./config/env');
const webhookRoutes = require('./routes/webhook');

const app = express();

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
