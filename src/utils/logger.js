const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Cria o diretório de logs, se não existir
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configura o logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'bot.log') }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

module.exports = logger;