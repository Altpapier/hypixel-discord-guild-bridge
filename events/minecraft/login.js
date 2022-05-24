const fs = require('fs');
const config = require('../../config.json');

let emittedEvent = false;
module.exports = {
    async execute(discordClient) {
        if (!emittedEvent) {
            config.minecraft.ingameName = minecraftClient._client.session.selectedProfile.name;
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

            if (config.channels.logOptions.hypixelLogin && config.channels.log) {
                await discordClient.channels.cache
                    .get(config.channels.log)
                    ?.send(`${config.minecraft.ingameName + ' has' || 'I have'} logged in to Hypixel.`);
            }
            console.log('[MINECRAFT] Logged in!');
            emittedEvent = true;

            // LIMBO CHECK
            setTimeout(() => {
                minecraftClient.chat('/locraw');
            }, 5000);
            setInterval(() => {
                minecraftClient.chat('/locraw');
            }, 1000 * 60);
        }
    },
};
