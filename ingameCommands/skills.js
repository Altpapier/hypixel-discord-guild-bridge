const config = require('../config.json');
const { getPlayer } = require('../helper/functions.js');
const { getSkillAverage } = require('../helper/skills');

module.exports = {
    name: 'skills',
    execute: async (discordClient, message, messageAuthor) => {
        if (config.ingameCommands.skills) {
            let { 1: username, 2: profile } = message.split(' ');

            if (!username) username = messageAuthor;

            const searchedPlayer = await getPlayer(username, profile).catch((err) => {
                return minecraftClient.chat(`/gc @${messageAuthor} ${err}`);
            });
            const playerProfile = searchedPlayer.memberData;

            const skills = getSkillAverage(playerProfile, 2);

            minecraftClient.chat(`/gc @${messageAuthor}${messageAuthor === username ? "'s" : ` ${username}'s`} skill average is ${skills}.`);
        }
    },
};
