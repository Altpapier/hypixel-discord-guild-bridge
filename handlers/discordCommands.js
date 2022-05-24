const fs = require('fs');
const { Collection } = require('discord.js');

module.exports = (discordClient) => {
    discordClient.commands = new Collection();

    const commandFiles = fs.readdirSync('./slashCommands/');
    for (const file of commandFiles) {
        const command = require(`../slashCommands/${file}`);
        if (command.name) {
            discordClient.commands.set(command.name, command);
        } else {
            continue;
        }
    }
};
