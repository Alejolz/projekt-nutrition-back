# 🍎 NutriBot - WhatsApp AI Chatbot

Bot inteligente de WhatsApp para nutrición y recetas, impulsado por OpenAI.

## 📁 Estructura del Proyecto

```
nutribot/
├── src/
│   ├── config/           # Configuración (variables de entorno)
│   ├── controllers/      # Lógica de negocio (manejo de mensajes)
│   ├── services/         # Servicios externos (OpenAI, Twilio, estado)
│   ├── routes/           # Rutas y webhooks
│   ├── utils/            # Utilidades (logger, helpers)
│   └── app.js            # Configuración de Express
│
├── server.js             # Punto de entrada
├── package.json
├── .env                  # Variables de entorno (no subir a git)
├── .env.example          # Plantilla de variables
└── README.md             # Este archivo
```

## 🚀 Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd nutribot
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Edita `.env` con tus credenciales:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER`
   - `BUTTONS_CONTENT_SID`
   - `OPENAI_API_KEY`

4. **Iniciar el servidor**
   ```bash
   npm start
   ```
   El servidor estará en `http://localhost:3000`

## 🔗 Configurar Webhook en Twilio

En el panel de Twilio, configura el webhook para recibir mensajes:
- **URL**: `https://tu-dominio.com/`
- **Método**: POST

## 📝 API Endpoints

### `GET /health`
Verifica que el servidor está funcionando.

```bash
curl http://localhost:3000/health
```

### `POST /`
Webhook para recibir mensajes de Twilio (uso interno).

## 🤖 Funcionalidades

- **Menú Principal**: Selecciona entre 3 opciones
  - 1️⃣ Hablar con IA
  - 2️⃣ Pedir una receta
  - 3️⃣ Gestión de perfil
- **Chat con IA**: Conversación inteligente con OpenAI
- **Generador de Recetas**: Pide una receta y el bot genera una personalizada
- **Botones Interactivos**: Navega fácilmente entre opciones

## 📦 Dependencias

- `express` - Framework web
- `twilio` - API de WhatsApp
- `axios` - HTTP client
- `dotenv` - Variables de entorno

## 🛠️ Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto donde corre el servidor (default: 3000) |
| `NODE_ENV` | Ambiente (development/production) |
| `TWILIO_ACCOUNT_SID` | ID de cuenta de Twilio |
| `TWILIO_AUTH_TOKEN` | Token de autenticación de Twilio |
| `TWILIO_WHATSAPP_NUMBER` | Número de WhatsApp de Twilio |
| `BUTTONS_CONTENT_SID` | SID del template de botones de Twilio |
| `OPENAI_API_KEY` | API key de OpenAI |

## 📚 Archivos Principales

### `src/config/env.js`
Centraliza todas las variables de entorno.

### `src/services/aiService.js`
Interfaz con OpenAI para chat e imágenes.

### `src/services/whatsappService.js`
Cliente de Twilio para enviar mensajes.

### `src/services/userStateService.js`
Gestiona el estado de usuarios (en memoria).

### `src/controllers/messageController.js`
Lógica principal: flujo de conversación, menús, etc.

### `src/routes/webhook.js`
Endpoint para recibir mensajes de Twilio.

## 🔄 Flujo de Mensajes

```
Usuario envía mensaje
       ↓
Webhook recibe en POST /
       ↓
messageController.handleIncomingMessage()
       ↓
Verifica estado del usuario
       ↓
Ejecuta acción (IA, receta, perfil)
       ↓
whatsappService envía respuesta
```

## 🚨 Problemas Comunes

**Error: "TWILIO_ACCOUNT_SID not defined"**
- Verifica que el archivo `.env` existe y tiene las credenciales

**Error: "Invalid OpenAI API Key"**
- Confirma que `OPENAI_API_KEY` es válida en `.env`

**Webhook no recibe mensajes**
- Verifica que la URL es pública y alcanzable desde internet
- Comprueba que el método es POST

## 💡 Mejoras Futuras

- [ ] Base de datos para persistencia de usuarios
- [ ] Historias médicas personalizadas
- [ ] Análisis nutricional de imágenes
- [ ] Integración con nutricionistas
- [ ] Tests automatizados

## 📄 Licencia

ISC

## 👤 Autor

Tu nombre aquí

---

**¿Preguntas?** Abre un issue o contacta al equipo.
