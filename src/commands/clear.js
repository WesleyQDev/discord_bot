const { ApplicationCommandType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'clear', 
    description: 'Limpa mensagens do canal',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'quantidade',
            description: 'Número de mensagens para apagar (1-99)',
            type: 3,
            required: true
        }
    ],
    
    run: async (client, interaction) => {
        // Verifica permissões
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({
                content: '❌ Você não tem permissão para usar este comando!',
                ephemeral: true
            });
        }

        const quantidade = parseInt(interaction.options.getString('quantidade'));

        // Valida a quantidade
        if (isNaN(quantidade) || quantidade < 1 || quantidade > 99) {
            return interaction.reply({
                content: '❌ Forneça um número entre 1 e 99!',
                ephemeral: true
            });
        }

        try {
            // Deleta as mensagens
            const mensagens = await interaction.channel.messages.fetch({ limit: quantidade });
            await interaction.channel.bulkDelete(mensagens, true);

            // Envia confirmação
            await interaction.reply({
                content: `✅ ${quantidade} mensagens foram apagadas!`,
                ephemeral: true
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({
                content: '❌ Erro ao tentar apagar as mensagens.',
                ephemeral: true
            });
        }
    }
};