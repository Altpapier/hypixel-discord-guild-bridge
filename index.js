const { Client, Intents } = require('discord.js');
const discordClient = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS],
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

global.minecraftClient = mineflayer.createBot(minecraftLoginOptions);

startMinecraftBot(minecraftClient, discordClient);
async function startMinecraftBot(minecraftClient, discordClient) {
    minecraftClient.on('end', async () => {
        if (config.channels.logOptions.hypixelDisconnect) {
            await discordClient.channels.cache
                .get(config.channels.log)
                ?.send(`${config.minecraft.ingameName + ' has' || 'I have'} been disconnected from Hypixel. Trying to reconnect...`);
        }
        global.minecraftClient = mineflayer.createBot(minecraftLoginOptions);
        startMinecraftBot(minecraftClient, discordClient);
    });

    require('./handlers/minecraftEvents')(discordClient);
    require('./handlers/minecraftCommands')(discordClient);
}

require('./handlers/discordEvents')(discordClient);
require('./handlers/discordCommands')(discordClient);
require('./handlers/api')();

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

discordClient.login(config.keys.discordBotToken);
