const { Client, Intents } = require('discord.js');
const discordClient = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

const config = require('./config.json');
const mineflayer = require('mineflayer');

const minecraftLoginOptions = {
    host: 'mc.hypixel.net',
    port: 25565,
    username: config.minecraft.username,
    auth: config.minecraft.microsoftAuth ? 'microsoft' : 'mojang',
    version: '1.8.9',
    viewDistance: 'tiny',
    chatLengthLimit: 256,
};

if (!config.minecraft.doNotUsePassword) minecraftLoginOptions.password = config.minecraft.password;

let minecraftClient = mineflayer.createBot(minecraftLoginOptions);
startMinecraftBot(minecraftClient, discordClient);
async function startMinecraftBot(minecraftClient, discordClient) {
    require('./handlers/minecraftEvents')(minecraftClient, discordClient);

    minecraftClient.on('end', async () => {
        if (config.channels.logOptions.hypixelDisconnect) {
            await discordClient.channels.cache
                .get(config.channels.log)
                ?.send(`${config.minecraft.ingameName + ' has' || 'I have'} been disconnected from Hypixel. Trying to reconnect...`);

            minecraftClient = mineflayer.createBot(minecraftLoginOptions);
            startMinecraftBot(minecraftClient, discordClient);
        }
    });
}
require('./handlers/discordEvents')(minecraftClient, discordClient);
require('./handlers/discordCommands')(minecraftClient, discordClient);
require('./handlers/minecraftCommands')(minecraftClient, discordClient);
require('./handlers/api')(minecraftClient);

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

discordClient.login(config.keys.discordBotToken);
