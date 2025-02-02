const fs = require('fs').promises;
require('colors');
const Discord = require('discord.js');

async function commandsHandler(client) {
    const slashArray = [];
    const comandosCarregados = [];
    client.slashCommands = new Discord.Collection();

    try {
        // Lê as pastas de comandos
        const folders = await fs.readdir('./Commands');

        // Processa as pastas e arquivos de forma simultânea
        const folderPromises = folders.map(async (subfolder) => {
            const files = await fs.readdir(`./Commands/${subfolder}/`);
            const commandFiles = files.filter(file => file.endsWith('.js'));

            // Processa cada arquivo de comando
            const commandPromises = commandFiles.map(async (file) => {
                try {
                    const command = require(`../Commands/${subfolder}/${file}`);
                    if (!command.name) {
                        console.log(`⚠️ Comando sem nome encontrado em ${subfolder}/${file}`.yellow);
                        return;
                    }

                    // Adiciona o comando à coleção
                    client.slashCommands.set(command.name, command);
                    slashArray.push(command);
                    comandosCarregados.push(command.name);
                } catch (err) {
                    console.log(`❌ Erro ao carregar comando ${file}: ${err.message}`.red);
                }
            });

            await Promise.all(commandPromises);
        });

        // Espera o processamento de todas as pastas
        await Promise.all(folderPromises);

        client.on('ready', async () => {
            try {
                // Registra os comandos para todos os servidores
                const guildCommands = client.guilds.cache.map(guild => guild.commands.set(slashArray));
                await Promise.all(guildCommands);

                console.log(`📘 Comandos Carregados com sucesso: [${comandosCarregados.join(', ')}]`.blue);
            } catch (err) {
                console.log(`❌ Erro ao registrar comandos nos servidores: ${err.message}`.red);
            }
        });

    } catch (error) {
        console.error('❌ Erro ao carregar comandos:'.red, error);
    }
}

module.exports = commandsHandler;
