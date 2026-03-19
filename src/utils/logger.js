/**
 * Logger simple para desarrollo
 * TODO: Usar winston o similar en producción
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

function info(message, data) {
  log('INFO', message, data);
}

function error(message, data) {
  log('ERROR', message, data);
}

function warn(message, data) {
  log('WARN', message, data);
}

function debug(message, data) {
  if (process.env.NODE_ENV === 'development') {
    log('DEBUG', message, data);
  }
}

module.exports = {
  info,
  error,
  warn,
  debug,
};
