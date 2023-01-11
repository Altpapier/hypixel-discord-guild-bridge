const config = require('../config.json');
const { getPlayer, toFixed } = require('../helper/functions.js');

module.exports = {
    name: 'level',
    execute: async (discordClient, message, messageAuthor) => {
        if (config.ingameCommands.level) {
            let { 1: username, 2: profile } = message.split(' ');

            if (!username) username = messageAuthor;

            const searchedPlayer = await getPlayer(username, profile).catch((err) => {
                return minecraftClient.chat(`/gc @${messageAuthor} ${err}`);
            });
            const playerProfile = searchedPlayer.memberData;

            minecraftClient.chat(
                `/gc @${messageAuthor}${messageAuthor === username ? "'s" : ` ${username}'s`} SkyBlock level is ${Number(
                    toFixed((playerProfile.leveling?.experience || 0) / 100),
                    2
                )}.`
            );
        }
    },
};
