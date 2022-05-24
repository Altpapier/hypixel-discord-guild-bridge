const fs = require('fs');

module.exports = (discordClient) => {
    fs.readdirSync('./events/minecraft')
        .filter((file) => file.endsWith('.js'))
        .forEach((file) => {
            const event = require(`../events/minecraft/${file}`);
            const name = file.split('.')[0];
            minecraftClient.on(name, (...args) => event.execute(discordClient, ...args));
        });
};
