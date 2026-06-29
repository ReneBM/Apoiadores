/**
 * Logger simples baseado em console com timestamps e níveis.
 * Em produção, pode ser substituído por Winston ou Pino.
 */

const timestamp = () => new Date().toISOString();

const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({ level: 'INFO', timestamp: timestamp(), message, ...meta }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: timestamp(), message, ...meta }));
  },
  error: (message, meta = {}) => {
    console.error(JSON.stringify({ level: 'ERROR', timestamp: timestamp(), message, ...meta }));
  },
};

module.exports = logger;
