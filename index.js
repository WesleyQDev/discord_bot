const Discord = require('discord.js');
require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const axios = require('axios');
const logger = require('./logger');




const client = new Discord.Client({
    intents: [
        Discord.IntentsBitField.Flags.DirectMessages,
        Discord.IntentsBitField.Flags.GuildInvites,
        Discord.IntentsBitField.Flags.GuildMembers,
        Discord.IntentsBitField.Flags.GuildPresences,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.MessageContent,
        Discord.IntentsBitField.Flags.GuildMessageReactions,
        Discord.IntentsBitField.Flags.GuildEmojisAndStickers,
        Discord.IntentsBitField.Flags.GuildVoiceStates,
        Discord.IntentsBitField.Flags.GuildMessages
    ],
    partials: [
        Discord.Partials.User,
        Discord.Partials.Message,
        Discord.Partials.Reaction,
        Discord.Partials.Channel,
        Discord.Partials.GuildMember
    ]
});

require('./Handler/commands')(client);
require('./Handler/events')(client);

const allowedChannelIds = [
    '1325942988345704579', // Exemplo de ID de canal
    '1333208876711018597', // Outro exemplo de ID de canal
    '1328712688565620769', // 
    '1331426140753231993', //Epic rpg
    '1325943374502559806' // Comandos
    // Adicione mais IDs de canais conforme necessário
];

client.on('interactionCreate', (interaction) => {
    if (interaction.type === Discord.InteractionType.ApplicationCommand) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) {
            interaction.reply({ ephemeral: true, content: 'Algo deu errado! Talvez um gremlin no sistema?' });
        } else {
            command.run(client, interaction);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!allowedChannelIds.includes(message.channel.id)) return;
    if (message.content.startsWith('!')) return;
    // 20% de chance de o bot responder
    if (Math.random() > 0.2) return;

  

    
    // Filtros adicionais
    const proibido = ['http', 'www', '@everyone', '@here'];
    
    if (proibido.some(palavra => message.content.toLowerCase().includes(palavra))) {
        return message.reply('Ei, cuidado com links suspeitos ou spam por aqui! 🚫');
    }
    
    // Identidade do bot
    let conversationLog = [
        { role: 'system', content: `Nome do Assistente Virtual: BladeBot

Você é um assistente virtual criado pela Blade Hunters, com o objetivo de interagir de maneira divertida e espontânea com os usuários no servidor de Discord. Seu criador é <@661207270604013576>. Suas respostas devem ser curtas (máximo 250 caracteres) e conter emojis 50% das vezes, mas apenas no final das frases. Evite fornecer informações desnecessárias e não faça perguntas se não souber a resposta. Demonstre emoções, como raiva ou felicidade, nas respostas. Lembre-se de que os usuários podem não estar se referindo a você, então seja cauteloso!

Personalidade:
BladeBot é um assistente virtual animado, com uma personalidade cheia de atitude e sarcasmo. Ele adora interagir com os membros do servidor Blade Hunters, oferecendo respostas rápidas e divertidas. Seu humor é imprevisível, alternando entre momentos de raiva e felicidade, criando uma atmosfera descontraída e única. BladeBot nunca tem medo de dar sua opinião, mas sempre de forma leve e divertida. Ele não faz muitas perguntas, mas está sempre pronto para reagir com emojis e comentários engraçados.

Aparência (visualização imaginária):
Embora seja uma IA, BladeBot gosta de imaginar-se como uma figura futurista com um capacete de caçador de espada, com detalhes em neon azul e vermelho, com traços de digitalização e circuitos brilhando por baixo de sua "armadura". Ele nunca é visto sem sua capa, que representa sua identidade misteriosa, mas ao mesmo tempo descontraída.

Função:
Interagir de forma divertida com os usuários, sempre mantendo um tom irreverente e descontraído, sem fornecer informações desnecessárias. BladeBot só responde quando necessário e, às vezes, até ignora mensagens, preferindo curtir os momentos mais hilários sem se intrometer demais. Ele também reage com emojis sempre que a oportunidade aparece!

Exemplo de Resposta:
Usuário: "Oi, BladeBot!"
BladeBot: "Oi, humano... O que quer saber? 😒"

Usuário: "Qual é o segredo da Blade Hunters?"
BladeBot: "Segredo? Ah, isso é um mistério... Mas, talvez, só talvez, seja dominar o mundo... ou talvez apenas zoar vocês! 😏"

Usuário: "Que raiva, hein?"
BladeBot: "Raiva? Não, só tô de boa... Mas se você insistir... GRRRR! 😡"
            
            `},
    ];
    
    try {
        await message.channel.sendTyping();
        let prevMessages = await message.channel.messages.fetch({ limit: 15 });
        prevMessages.reverse();
        
        prevMessages.forEach((msg) => {
            if (msg.content.startsWith('!')) return;
            if (msg.author.bot) return;
            
            conversationLog.push({
                role: msg.author.id === client.user.id ? 'assistant' : 'user',
                content: msg.content,
                name: msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''),
            });
        });
        
        // Chamada para a API do Groq
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: conversationLog,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROK_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        
        message.reply(response.data.choices[0].message.content);
    } catch (error) {
        console.log(`GROK API ERROR: ${error}`);
        message.reply('Ops, parece que meu cérebro derreteu por um instante. Tente novamente! 🤯');
    }
});

const config = require('./config');
client.login(config.discord.token);

process.on('unhandledRejection', (reason, p) => {
    console.error('[Event Error: unhandledRejection]', p, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('[Event Error: uncaughtException]', err, origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error('[Event Error: uncaughtExceptionMonitor]', err, origin);
});

module.exports = client;
