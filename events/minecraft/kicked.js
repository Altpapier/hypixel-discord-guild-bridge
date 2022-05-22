const config = require('../../config.json');

module.exports = {
    async execute(minecraftClient, discordClient, reason) {
        if (config.channels.logOptions.hypixelKicked && config.channels.log) {
            await discordClient.channels.cache
                .get(config.channels.log)
                ?.send(`${config.minecraft.ingameName + ' has' || 'I have'} been kicked from Hypixel. Reason: ${reason}`);
            process.exit();
        }
    },
};
