const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function commandsHandler(client) {
    // Create a new collection for commands
    client.commands = new Collection();
    client.slashCommands = new Collection();

    // Get commands directory path
    const commandsPath = path.join(__dirname, '../commands');

    try {
        // Read command files
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        // Load each command
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            // Register command if it has required properties
            if (command.name) {
                client.slashCommands.set(command.name, command);
                logger.info(`Comando carregado: ${command.name}`);
            } else {
                logger.warn(`Comando ${file} não tem as propriedades necessárias`);
            }
        }

        // Register slash commands with Discord
        client.on('ready', async () => {
            try {
                const commands = Array.from(client.slashCommands.values());
                await client.application.commands.set(commands);
                logger.info('Slash commands registrados globalmente');
            } catch (error) {
                logger.error(`Erro ao registrar slash commands: ${error}`);
            }
        });

        // Handle command interactions
        client.on('interactionCreate', async interaction => {
            if (!interaction.isCommand()) return;

            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.run(client, interaction);
            } catch (error) {
                logger.error(`Erro ao executar comando ${interaction.commandName}: ${error}`);
                await interaction.reply({
                    content: 'Houve um erro ao executar este comando.',
                    ephemeral: true
                }).catch(() => {});
            }
        });

    } catch (error) {
        logger.error(`Erro ao carregar comandos: ${error}`);
    }
}

module.exports = commandsHandler;