
const Discord = require('discord.js');
const axios = require('axios');
const { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ia',
    description: 'Faça uma pergunta para a IA',
    type: Discord.ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'pergunta',
            description: 'O que você quer perguntar?',
            type: Discord.ApplicationCommandOptionType.String,
            required: true
        }
    ],

    run: async (client, interaction) => {
        await interaction.deferReply();
        
        const pergunta = interaction.options.getString('pergunta');

        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { 
                            role: 'system', 
                            content: 'Você é um assistente útil e amigável. Responda de forma concisa.'
                        },
                        {
                            role: 'user',
                            content: pergunta
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

            const resposta = response.data.choices[0].message.content;
            
            const embed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Resposta da IA')
                .setDescription(resposta)
                .setFooter({ text: 'Powered by Groq AI' });

            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Ocorreu um erro ao processar sua pergunta.');
        }
    }
};