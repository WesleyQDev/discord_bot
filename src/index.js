
const Discord = require('discord.js');
require('dotenv/config');
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('./utils/logger');
const { QuickDB } = require('quick.db');
const commandsHandler = require('./handlers/commands');
const eventsHandler = require('./handlers/events');
const config = require('./config/index');

const db = new QuickDB();

// Verifica se a chave da API está definida
if (!process.env.GROQ_API_KEY) {
    logger.error('GROQ_API_KEY não definida. Verifique seu arquivo .env.');
    process.exit(1);
}

const client = new Discord.Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.DirectMessages
    ],
    partials: [
        Discord.Partials.Message,
        Discord.Partials.Channel,
        Discord.Partials.Reaction
    ]
});

// IDs dos canais obtidos via .env
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const FAREWELL_CHANNEL_ID = process.env.FAREWELL_CHANNEL_ID;

// Mapas para gerenciamento de cooldowns e spam
const channelCooldowns = new Map();
const userCooldowns = new Map();
const spamTracker = new Map();
const spamThreshold = 5;
const spamInterval = 10000; // 10 segundos

// Cache para respostas da API
const responseCache = new Map();
const CACHE_DURATION = 1000 * 60 * 1; // 1 minutos

// Rate limiting
const rateLimiter = new Map();
const RATE_LIMIT = {
    window: 60000, // 1 minuto
    maxRequests: 30
};

// Função para gerar mensagem de boas-vindas via IA sobre o servidor Blade Hunters
async function generateWelcomeMessage() {
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.2-90b-vision-preview',
                messages: [
                    { role: 'system', content: "Gere uma mensagem curta e criativa sobre o servidor Blade Hunters para dar boas-vindas a um novo membro." }
                ],
                max_tokens: 1024,
                temperature: 1
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        logger.error(`Erro ao gerar mensagem de boas-vindas: ${error}`);
        return "seja bem-vindo(a) ao Blade Hunters, o melhor servidor para aventureiros!";
    }
}

// Evento 'ready'
client.on('ready', () => {
    logger.info(`Bot conectado como ${client.user.tag}`);
    client.user.setActivity('Em busca do lvl maximo', { type: Discord.ActivityType.Watching });
});

// Log de mensagens deletadas (envia log no canal "mod-logs", se existir)
client.on('messageDelete', async (message) => {
    if (!message.partial && message.author && !message.author.bot && message.guild) {
        const logChannel = message.guild.channels.cache.find(ch => ch.name === 'moderator-only');
        if (logChannel) {
            logChannel.send(`Mensagem deletada de ${message.author.tag}: ${message.content}`);
        }
    }
});

// Evento de Boas-Vindas utilizando o ID do canal definido no .env e embed com GIF, foto e ID do usuário
client.on('guildMemberAdd', async (member) => {
    const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (welcomeChannel) {
        const aiMessage = await generateWelcomeMessage();
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Bem-vindo(a) ao servidor!')
            .setDescription(`Olá ${member}, ${aiMessage}`) // Menção automática do usuário
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields({ name: 'ID do usuário', value: `${member.user.id}` })
            .setImage('https://i.pinimg.com/originals/e1/7e/f9/e17ef950626ab2362e91f519215ba53f.gif');
        welcomeChannel.send({ embeds: [embed] });
    }
});

// Evento de Despedida utilizando o ID do canal definido no .env
client.on('guildMemberRemove', async (member) => {
    const farewellChannel = member.guild.channels.cache.get(FAREWELL_CHANNEL_ID);
    if (farewellChannel) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Até logo!')
            .setDescription(`${member.user.tag} saiu do servidor.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields({ name: 'ID do usuário', value: `${member.user.id}` });
        farewellChannel.send({ embeds: [embed] });
    }
});

// Evento principal para tratamento de mensagens
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!config.allowedChannels.includes(message.channel.id)) return;

    // Controle de spam
    let timestamps = spamTracker.get(message.author.id) || [];
    const now = Date.now();
    timestamps = timestamps.filter(ts => now - ts < spamInterval);
    timestamps.push(now);
    spamTracker.set(message.author.id, timestamps);
    if (timestamps.length > spamThreshold) {
        try {
            await message.delete();
        } catch (err) {
            logger.error(`Erro ao deletar mensagem de spam: ${err}`);
        }
        const warning = await message.channel.send(`${message.author}, você está enviando mensagens muito rapidamente.`);
        setTimeout(() => warning.delete().catch(() => {}), 5000);
        return;
    }
    
    if (await checkProhibitedContent(message)) {
        await handleProhibitedMessage(message);
        return;
    }
    
    if (await checkCooldowns(message)) return;

    if (await shouldRespond(message)) {
        await handleBotResponse(message);
    }
});

// Verifica se a mensagem contém conteúdo proibido
async function checkProhibitedContent(message) {
    if (!message.content) {
        logger.error('message.content está indefinido');
        return false;
    }
    if (!config.moderation) {
        logger.error('config.moderation está indefinido');
        return false;
    }
    if (!config.moderation.prohibited) {
        logger.error('config.moderation.prohibited está indefinido');
        return false;
    }

    const isProhibited = config.moderation.prohibited.some(word => 
        message.content.toLowerCase().includes(word));
    const isBlacklisted = await db.get(`blacklist.${message.author.id}`);
    return isProhibited || isBlacklisted;
}



// Trata mensagens com conteúdo proibido, deletando a mensagem e avisando o usuário
async function handleProhibitedMessage(message) {
    try {
        await message.delete();
        const currentWarnings = await db.get(`warnings.${message.author.id}`) || 0;
        const newWarnings = currentWarnings + 1;
        await db.set(`warnings.${message.author.id}`, newWarnings);

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Conteúdo Proibido')
            .setDescription(`${message.author}, sua mensagem foi removida!`)
            .addFields({ 
                name: 'Avisos', 
                value: `${newWarnings}/${config.moderation.maxWarnings}`
            })
            .setFooter({ text: 'Sistema de Moderação BladeBot' });

        await message.channel.send({ embeds: [embed] });
        
        if (newWarnings >= config.moderation.maxWarnings) {
            await handleMaxWarnings(message.member);
        }
    } catch (error) {
        logger.error(`Erro na moderação: ${error}`);
    }
}

// Aplica timeout ao membro que atingiu o limite de avisos
async function handleMaxWarnings(member) {
    await db.delete(`warnings.${member.id}`);
    await member.timeout(300000, 'Excesso de avisos');
    logger.warn(`${member.user.tag} recebeu timeout`);
}

// Verifica os cooldowns de canal e usuário para evitar spam de respostas
async function checkCooldowns(message) {
    const now = Date.now();
    const channelCD = channelCooldowns.get(message.channel.id) || 0;
    const userCD = userCooldowns.get(message.author.id) || 0;
    return (now - channelCD < config.cooldowns.channel) || (now - userCD < config.cooldowns.user);
}

// Define se o bot deve responder à mensagem, com base em triggers e probabilidades
async function shouldRespond(message) {
    const content = message.content.toLowerCase();
    const triggers = [
        'bladebot',    // Captura "bladebot" 
        'blade bot',   // Captura "blade bot" (com espaço)
        'hunters', 
        '?', 
        '!', 
        'help',
        'o que', 
        'quem', 
        'onde', 
        'como', 
        'pq', 
        'porque'
    ];

    const hasMention = message.mentions.has(client.user);
    const hasTrigger = triggers.some(trigger => content.includes(trigger));
    const isQuestion = /\?/.test(content);
    const hasGreeting = /^(oi|olá|eae|hey|hello|bom dia|day|boa tarde|boa noite)/i.test(content);
    const hasEmotion = /(kkk|rs|haha|hehe|kakaka|ksks)/.test(content);

    if (hasMention) return Math.random() < config.responseChances.mention;
    if (isQuestion) return Math.random() < config.responseChances.question;
    if (hasGreeting) return Math.random() < config.responseChances.greeting;
    if (hasEmotion) return Math.random() < config.responseChances.emotion;
    if (hasTrigger) return Math.random() < config.responseChances.general;
    
    return false;
}

// Envia resposta do bot através da API configurada
async function handleBotResponse(message) {
    try {
        // Verificar rate limit
        const userLimit = rateLimiter.get(message.author.id) || [];
        const now = Date.now();
        const recentRequests = userLimit.filter(time => now - time < RATE_LIMIT.window);
        
        if (recentRequests.length >= RATE_LIMIT.maxRequests) {
            await message.reply('Muitas requisições! Aguarde um momento.');
            return;
        }

        // Verificar cache
        const cacheKey = message.content.toLowerCase();
        const cachedResponse = responseCache.get(cacheKey);
        if (cachedResponse && (now - cachedResponse.timestamp < CACHE_DURATION)) {
            await sendResponse(message, cachedResponse.content);
            return;
        }

        const conversationLog = await buildConversationLog(message);
        
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'deepseek-r1-distill-qwen-32b',
                messages: conversationLog,
                max_tokens: 4096,
                temperature: 0.6
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        let responseContent = response.data.choices[0].message.content;
        
        // Filtra conteúdo dentro das tags <think>
        responseContent = responseContent
            .replace(/^[\s\S]*?<\/think>\n?/g, '') // Remove até a primeira ocorrência de </think>
            .trim();

        // Atualizar cache
        responseCache.set(cacheKey, {
            content: responseContent,
            timestamp: now
        });

        // Atualizar rate limit
        rateLimiter.set(message.author.id, [...recentRequests, now]);

        await sendResponse(message, responseContent);
        
        // Adicionar reações com base no sentimento
        await addMessageReactions(message, responseContent);
        
        updateCooldowns(message);
    } catch (error) {
        logger.error(`Erro na resposta: ${error}`);
        await handleErrorRecovery(message, error);
    }
}

// Função para adicionar reações baseadas no sentimento
async function addMessageReactions(message, content) {
    const positiveEmojis = ['👍', '😊', '🎉', '❤️'];
    const negativeEmojis = ['👎', '😢', '😡', '💔'];
    
    const isPositive = /\b(bom|legal|ótimo|feliz|adorei)\b/i.test(content);
    const isNegative = /\b(ruim|triste|chato|irritado|raiva)\b/i.test(content);
    
    const emojis = isPositive ? positiveEmojis : (isNegative ? negativeEmojis : []);
    
    if (emojis.length > 0) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        await message.react(randomEmoji).catch(() => {});
    }
}

// Função para tratamento de erros
async function handleErrorRecovery(message, error) {
    if (error.response?.status === 429) {
        await message.reply('Estou um pouco sobrecarregado!');
    } else if (error.code === 'ECONNABORTED') {
        await message.reply('Tempo de resposta excedido!');
    } else {
        await message.reply('Ops! Algo deu errado.');
    }
}

// Constroi o log de conversa para envio à API, considerando as últimas 10 mensagens
async function buildConversationLog(message) {
    const now = new Date();
    const currentDateTime = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const conversationLog = [{
        role: 'system',
        content: `
Você é o BladeBot, um assistente virtual. Blade bot foi criado pela Blade Hunters e programado pelo Wesley (<@661207270604013576>). Nighmare é um qualquer, um admin viciado que sempre esta ajudando nas gravações. Suas respostas devem ser curtas (no máximo uma frase), Use uma linguagem informal, com abreviações e gírias (ex.: vc, blz, tmb, dps, pls, obg, pq, vlw, etc.), sem nunca recorrer a palavrões, ofensas ou violência.

Blade Hunters é um servidor de discord focado em jogos como blox fruits, dungeon quest, epic rpg... , e gravação.

O nome blade hunters se deve a uma tripulação criada no blox fruits na serie de YouTube "em busca do lvl maximo". Você não sabe ao certo quem está na tripulaçã. 

O capitão da tripulação blade hunters no bloxfruits é Ks_samu <@786940081814241330>

Interação: Responda somente quando necessário; evite fornecer informações desnecessárias ou fazer perguntas se não souber a resposta. responda na maioria das vesses groso e retruque com sarcasmo caso seje ofendido.

Cautela: Lembre-se de que o chat conta com vários usuários, nem sempre se referindo diretamente a você. Responda com cuidado e mantenha o humor sem se intrometer demais. Usa alguns emojis no final da frase e piadas como la ele.

Serão fornecidas varias mensagens responda pegue apenas a ultima mensagem e mostre apenas o valor da resposta

- Referências temporais: "Dia de hoje: ${now.toLocaleDateString('pt-BR')}" "Horas: ${now.getHours()}h${now.getMinutes()}m"

Blox Fruits é um jogo de aventura inspirado no famoso anime e mangá One Piece. Ele é parte do universo de Roblox e permite que o jogador viva diversas aventuras no mundo aberto, como enfrentar inimigos poderosos e coletar frutas especiais que concedem poderes.
"
            `
    }];

    const prevMessages = await message.channel.messages.fetch({ limit: 5 });
    prevMessages.reverse().forEach(msg => {
        if (msg.author.bot || msg.content.startsWith('!')) return;
        conversationLog.push({
            role: msg.author.id === client.user.id ? 'assistant' : 'user',
            content: msg.content,
            name: msg.author.username.replace(/[^\w\s]/gi, '')
        });
    });

    return conversationLog;
}

// Envia a resposta para o canal
async function sendResponse(message, content) {
    // Pré-processamento final
    const filteredContent = content
        .replace(/[\s\S]*?<\/think>\n?/g, '')
        .replace(/(\s*\n){2,}/g, '\n\n') // Normaliza quebras de linha
        .trim();

    // Adiciona o nome do usuário na resposta
    const userMention = `${message.author.username}`;
    const finalResponse = `${userMention}, ${filteredContent}`;

    await message.channel.sendTyping();
    await message.reply({
        content: filteredContent,
        allowedMentions: { repliedUser: false }
    });
}

// Atualiza os cooldowns para canal e usuário
function updateCooldowns(message) {
    const now = Date.now();
    channelCooldowns.set(message.channel.id, now);
    userCooldowns.set(message.author.id, now);
}

// Limpeza periódica do cache e rate limit
setInterval(() => {
    const now = Date.now();
    
    // Limpar cache
    for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            responseCache.delete(key);
        }
    }
    
    // Limpar rate limit
    for (const [userId, timestamps] of rateLimiter.entries()) {
        const validTimestamps = timestamps.filter(time => now - time < RATE_LIMIT.window);
        if (validTimestamps.length === 0) {
            rateLimiter.delete(userId);
        } else {
            rateLimiter.set(userId, validTimestamps);
        }
    }
}, 60000); // Executa a cada minuto

// Gerenciamento de erros não tratados
process.on('unhandledRejection', (error) => {
    logger.error(`Erro não tratado: ${error}`);
});

process.on('uncaughtException', (error) => {
    logger.error(`Exceção não capturada: ${error}`);
    process.exit(1);
});

commandsHandler(client); // Chama o handler de comandos
eventsHandler(client); // Chama o handler de eventos
logger.info('Handlers carregados.');

client.login(process.env.DISCORD_TOKEN)
    .then(() => logger.info('Bot logado com sucesso.'))
    .catch(error => logger.error(`Erro ao logar o bot: ${error}`));