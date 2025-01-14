const Discord = require('discord.js');
const cor = require('../../config').discord.color;

module.exports = {
    name: 'clear',
    description: 'Limpa as mensagens de um canal',
    type: Discord.ApplicationCommandType.ChatInput,

    options: [
        {
            name: 'quantidade',
            description: 'Quantidade de mensagens a limpar (padrão: 100)',
            type: Discord.ApplicationCommandOptionType.Integer,
            required: false,
            minValue: 1,
            maxValue: 100,
        },
        {
            name: 'canal',
            description: 'Canal para limpar as mensagens (padrão: este canal)',
            type: Discord.ApplicationCommandOptionType.Channel,
            channelTypes: [Discord.ChannelType.GuildText],
            required: false,
        },
    ],

    run: async (client, interaction) => {
        // Obtemos a quantidade ou definimos o padrão de 100
        const quantidade = interaction.options.getInteger('quantidade') || 100;

        // Obtém o canal especificado ou usa o canal atual
        const canalSelecionado = interaction.options.getChannel('canal');
        const canal = canalSelecionado || interaction.channel;

        if (!canal.isTextBased()) {
            return interaction.reply({
                content: 'O canal selecionado não é válido para limpar mensagens.',
                ephemeral: true,
            });
        }

        try {
            // Deleta as mensagens no canal
            const mensagensDeletadas = await canal.bulkDelete(quantidade, true);

            // Cria o embed de resposta
            const embed = new Discord.EmbedBuilder()
                .setColor(cor)
                .setAuthor({
                    name: client.user.username,
                    iconURL: client.user.displayAvatarURL(),
                })
                .setDescription(
                    `🧹 **${mensagensDeletadas.size} mensagens foram limpas no canal ${canal}!**`
                );

            interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            interaction.reply({
                content:
                    'Houve um erro ao tentar limpar as mensagens. Verifique minhas permissões e tente novamente.',
                ephemeral: true,
            });
        }
    },
};
