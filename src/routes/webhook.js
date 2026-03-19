const express = require('express');
const { handleIncomingMessage } = require('../controllers/messageController');

const router = express.Router();

/**
 * Webhook para recibir mensajes de Twilio/WhatsApp
 */
router.post('/', async (req, res) => {
  try {
    console.log('📨 Mensaje recibido:', {
      from: req.body.From,
      body: req.body.Body,
      timestamp: new Date().toISOString(),
    });

    await handleIncomingMessage(req.body);
    // res.sendStatus(200); Twilio espera una respuesta rápida, pero no es necesario enviar un mensaje de vuelta aquí
  } catch (error) {
    console.error('❌ Error en webhook:', error.message);
    res.sendStatus(500);
  }
});

module.exports = router;
