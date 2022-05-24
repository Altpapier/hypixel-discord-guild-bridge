const fs = require('fs');

module.exports = (discordClient) => {
    fs.readdirSync('./events/discord')
        .filter((file) => file.endsWith('.js'))
        .forEach((file) => {
            const event = require(`../events/discord/${file}`);
            const name = file.split('.')[0];
            discordClient.on(name, event.execute.bind(null, discordClient));
        });
};
