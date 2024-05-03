const fs = require('fs');
const config = require('../config.json');
const BaseCommand = require('../ingameCommands/baseCommand.js')

module.exports = (discordClient) => {
    global.minecraftClient.commands = new Set();

    const commandFiles = fs.readdirSync('./ingameCommands/');
    for (const file of commandFiles) {
        const command = require(`../ingameCommands/${file}`);
        if (command instanceof Array) {
            command.forEach((c) => {
                if (!(c instanceof BaseCommand)) return;
                if (!c.execute) return;
                if (config.ingameCommands.disabled.includes(c.name)) return;
                minecraftClient.commands.add(c);
            });
        } else if (command instanceof BaseCommand) {
            if (config.ingameCommands.disabled.includes(command.name)) continue;
            if (!command.execute) continue;
            minecraftClient.commands.add(command);
        }
    }
};
