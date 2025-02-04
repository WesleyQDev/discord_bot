const Discord = require('discord.js');
const cor = require('../config').discord.color;
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'logs', // Propriedade obrigatória para identificar o comando
    description: 'Exibe os logs do bot.',
    type: Discord.ApplicationCommandType.ChatInput,
    
    run: async (client, interaction) => {
        // Verifica se o usuário é autorizado
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply('Você não tem permissão para ver os logs.');
        }

        // Define o caminho do arquivo de logs (ajuste se necessário)
        const logPath = path.join(__dirname, '../../logs', 'bot.log');

        // Garante que a pasta e o arquivo de logs existam
        if (!fs.existsSync(path.dirname(logPath))) {
            fs.mkdirSync(path.dirname(logPath), { recursive: true });
        }
        if (!fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, '');
        }

        fs.readFile(logPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Erro ao ler o arquivo de logs:', err);
                return interaction.reply('Erro ao ler os logs.');
            }

            if (data.length > 1900) {
                const buffer = Buffer.from(data, 'utf8');
                return interaction.reply({ files: [{ attachment: buffer, name: 'bot.log' }] });
            } else {
                const embed = new Discord.EmbedBuilder()
                    .setColor(cor)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('Logs do Bot')
                    .setDescription(`\`\`\`\n${data}\n\`\`\``)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }
        });
    }
};
