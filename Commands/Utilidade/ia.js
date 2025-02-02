const Discord = require('discord.js');
const axios = require('axios');
const cor = require('../../config').discord.color;

module.exports = {
    name: 'ia',
    description: 'O bot responde com base no input fornecido pelo usuário.',
    type: Discord.ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'mensagem',
            description: 'Mensagem para enviar ao assistente',
            type: Discord.ApplicationCommandOptionType.String,
            required: true,
        },
    ],

    run: async (client, interaction) => {
        // Verifica se a interação foi realizada por um usuário (não por outro bot)
        if (interaction.user.bot) return;

        // Log de contexto inicial do sistema
        let conversationLog = [
            {
                role: 'system',
                content: `
                
Nome do Assistente Virtual: BladeBot

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

`
            }
        ];

        try {
            // Mostra que o bot está digitando
            await interaction.channel.sendTyping();

            // Captura o input do usuário a partir da opção do comando
            const mensagem = interaction.options.getString('mensagem');

            conversationLog.push({
                role: 'user',
                content: mensagem,
                name: interaction.user.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''),
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

            // Responde com a mensagem gerada pela IA
            interaction.reply(response.data.choices[0].message.content);

        } catch (error) {
            console.log(`GROK API ERROR: ${error}`);
            interaction.reply('Ops, parece que algo deu errado. Tente novamente mais tarde! 🤯');
        }
    }
};
