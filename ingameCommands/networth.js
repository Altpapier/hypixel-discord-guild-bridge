const { getNetworth } = require('skyhelper-networth');
const config = require('../config.json');
const { getPlayer, numberformatter } = require('../helper/functions.js');

module.exports = {
    name: 'networth',
    execute: async (discordClient, message, messageAuthor) => {
        if (config.ingameCommands.networth) {
            let { 1: username, 2: profile } = message.split(' ');

            if (!username) username = messageAuthor;

            const searchedPlayer = await getPlayer(username, profile).catch((err) => {
                return minecraftClient.chat(`/gc @${messageAuthor} ${err}`);
            });

            const networth = await getNetworth(searchedPlayer.memberData, searchedPlayer.profileData?.banking?.balance, { onlyNetworth: true });

            if (networth.noInventory) {
                return minecraftClient.chat(
                    `/gc @${messageAuthor}${messageAuthor === username ? "'s" : ` ${username}'s`} inventory API is disabled.`
                );
            }

            minecraftClient.chat(
                `/gc @${messageAuthor}${messageAuthor === username ? "'s" : ` ${username}'s`} networth is ${numberformatter(
                    networth.networth.toFixed(),
                    3
                )}`
            );
        }
    },
};
