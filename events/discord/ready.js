const { hypixelRequest, nameToUUID, UUIDtoName } = require('../../helper/functions.js');
const config = require('../../config.json');
const fs = require('fs');
const { CronJob } = require('cron');

async function execute(discordClient) {
    console.log('[DISCORD] Logged in!');

    const guild = discordClient.guilds.cache.get(config.discordServer);
    if (guild) {
        const refreshedConfig = JSON.parse(fs.readFileSync('./config.json').toString());
        if (!refreshedConfig.slashCommandsSet) {
            const slashCommands = [];
            for (const command of discordClient.commands) {
                slashCommands.push({
                    name: command[1].name,
                    description: command[1].description,
                    options: command[1].options || [],
                });
            }
            await guild.commands.set(slashCommands);

            refreshedConfig.slashCommandsSet = true;
            fs.writeFileSync('./config.json', JSON.stringify(refreshedConfig, null, 2));
        }
    }

    async function sendDiscordMessage({ channelId, messageObject }) {
        messageObject.allowedMentions = { parse: [] };
        const channel = discordClient.channels.cache.get(channelId);
        if (channel) {
            await channel.send(messageObject);
        }
    }

    const guildMemberGEXPjob = new CronJob(
        '0 23 * * 0', // Every Sunday at 11:00 PM
        async function () {
            await updateGuildMemberData(true);
        },
        null,
        true,
        'America/New_York'
    );
    guildMemberGEXPjob.start();

    async function updateGuildMemberData(addToHistory) {
        const botUUID = minecraftClient?.player?.uuid || (await nameToUUID(config.minecraft.ingameName));
        const guildGEXPData = JSON.parse(fs.readFileSync('./data/guildGexp.json').toString());
        if (botUUID) {
            const guildData = await hypixelRequest(`https://api.hypixel.net/guild?player=${botUUID}`, true);
            if (guildData?.guild?.members) {
                const guildMembers = guildData.guild.members;
                const guildMemberNames = [];
                const RANK_TAG = {};
                for (const rank of guildData?.guild?.ranks || []) {
                    if (rank.tag) RANK_TAG[rank.name] = rank.tag;
                }
                const guildMemberRanks = {};
                for (const guildMember of guildMembers) {
                    const memberName = await UUIDtoName(guildMember.uuid);
                    if (memberName) {
                        guildMemberNames.push(memberName);

                        if (!(memberName in guildGEXPData)) {
                            guildGEXPData[memberName] = {
                                rank: guildMember.rank,
                                joined: guildMember.joined,
                                isInGuild: true,
                                gexpHistory: [],
                            };
                        }
                        guildGEXPData[memberName].gexpWeek = Object.values(guildMember.expHistory).reduce((a, b) => a + b);
                        guildGEXPData[memberName].isInGuild = true;
                        guildGEXPData[memberName].rank = guildMember.rank;
                        guildGEXPData[memberName].joined = guildMember.joined;
                        if (addToHistory) {
                            guildGEXPData[memberName].gexpHistory.push({
                                date: (Date.now() / 1000).toFixed(),
                                gexp: guildGEXPData[memberName].gexpWeek,
                            });
                        }
                    }
                    guildMemberRanks[guildMember.uuid] = RANK_TAG[guildMember.rank] || null;
                }
                for (const [name, value] of Object.entries(guildGEXPData)) {
                    if (!guildMemberNames.includes(name)) {
                        value.isInGuild = false;
                    }
                }
                fs.writeFileSync('./data/guildMembers.json', JSON.stringify(guildMemberNames));
                fs.writeFileSync('./data/guildRanks.json', JSON.stringify(guildMemberRanks));
                fs.writeFileSync('./data/guildGexp.json', JSON.stringify(guildGEXPData));
            }
        }
    }

    updateGuildMemberData();
    setInterval(() => {
        updateGuildMemberData();
    }, 1000 * 60 * 60);

    module.exports = {
        execute,
        sendDiscordMessage,
    };
}

module.exports = {
    execute,
};
