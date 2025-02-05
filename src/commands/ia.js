const { ApplicationCommandType, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
    name: 'ia',
    description: 'Converse com o BladeBot usando IA',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'mensagem',
            description: 'O que você quer dizer para o bot',
            type: 3, // STRING
            required: true
        }
    ],

    run: async (client, interaction) => {
        await interaction.deferReply();
        
        try {
            const userMessage = interaction.options.getString('mensagem');

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: `Você é o BladeBot, um assistente virtual divertido e sarcástico do servidor Blade Hunters. 
                            Mantenha suas respostas curtas (máximo 250 caracteres) e use emojis ocasionalmente.`
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const botResponse = response.data.choices[0].message.content;

            const embed = new EmbedBuilder()
                .setColor(config.discord.color)
                .setAuthor({
                    name: 'BladeBot',
                    iconURL: client.user.displayAvatarURL()
                })
                .addFields(
                    { name: '📨 Sua mensagem', value: userMessage },
                    { name: '🤖 Resposta', value: botResponse }
                )
                .setFooter({ text: 'Powered by Groq AI' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error(`Erro no comando ia: ${error}`);
            await interaction.editReply({
                content: '❌ Ops! Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.',
                ephemeral: true
            });
        }
    }
};