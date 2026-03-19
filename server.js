const app = require('./src/app');
const config = require('./src/config/env');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(
    `\n🚀 Servidor activo en puerto ${PORT}`,
    config.nodeEnv === 'development' ? '(Desarrollo)' : '(Producción)',
    `\n📍 http://localhost:${PORT}/health\n`
  );
});

