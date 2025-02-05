const logger = require('../../utils/logger');
require('dotenv').config(); // Carrega as variáveis do .env
const { Client, GatewayIntentBits } = require('discord.js');
const colors = require('colors'); // Importa a biblioteca colors

// Crie uma nova instância do cliente do Discord  s
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Variável para armazenar o tempo de início
const startTime = process.hrtime(); // Marca o tempo de início

// Evento de login bem-sucedido
client.once('ready', () => {
  const [seconds, nanoseconds] = process.hrtime(startTime); // Obtém o tempo de execução
  const timeInSeconds = (seconds + nanoseconds / 1e9).toFixed(2); // Converte para segundos

  logger.info(`🚀 Bot está online! ${timeInSeconds} segundos`); // Mostra o tempo em verde
});

// Evento de erro
client.on('error', (error) => {
  console.error('❌ Ocorreu um erro no bot:'.red, error); // Erro em vermelho com emoji
  console.log('💡 Detalhes do erro:'.yellow, error.message); // Detalhes do erro em amarelo
});

// Evento de erro no processo
process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:'.red, err);
  console.log('💡 Detalhes do erro:'.yellow, err.message);
});

// Evento quando o bot recebe uma mensagem
client.on('messageCreate', (message) => {
  if (message.content === '!ping') {
    message.reply('🏓 Pong!'.green); // Resposta com emoji verde
  }
});

// Loga o bot usando o token do .env
client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error('❌ Erro ao tentar logar no bot:'.red, error);
  console.log('💡 Verifique se o token está correto e no formato adequado.'.yellow);
});
