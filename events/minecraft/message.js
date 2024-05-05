const axios = require('axios');
const fs = require('fs');
const { MessageAttachment } = require('discord.js');
const config = require('../../config.json');
const { formatDiscordMessage, includesIgnored, isGuildEvent, isShortGuildEvent, sleep, nameToUUID, addCommas } = require('../../helper/functions.js');
const generateMessageImage = require('../../helper/messageToImage.js');
const { getRequirements, getRequirementEmbed } = require('../../helper/requirements.js');
const { getInfoText, getLeaderboard } = require('../../StatChecker.js');

const SHORT_STATS = {
    skyblockLevel: 'LVL',
    networth: 'NW',
    lilyWeight: 'LILY',
    senitherWeight: 'SEN',
    skillAverage: 'SA',
    hypixelLevel: 'HLVL',
    catacombs: 'CATA',
    slayer: 'SLAYER',
    bwLevel: 'BWSTARS',
    bwFKDR: 'BWFKDR',
};

let messagesCache = [];
let fragBotQueue = [];
let isInFragParty = false;
setInterval(() => {
    const { sendDiscordMessage } = require('../discord/ready');

    if (messagesCache.length > 0 && config.channels.ingameChatLog) {
        let messageString = messagesCache.join('\n');
        messagesCache = [];
        try {
            sendDiscordMessage({
                channelId: config.channels.ingameChatLog,
                messageObject: { content: formatDiscordMessage(messageString).slice(0, 1998) },
            });
        } catch (e) {
            console.error('Error sending message to discord. Client not ready yet.');
        }
    }
}, 2000);

function getLatestMessages() {
    return messagesCache;
}

module.exports = {
    getLatestMessages,
    async execute(discordClient, message) {
        const msgString = message.toString();
        const msgStringColor = message.toMotd();
        // LIMBO CHECK
        try {
            const parsedMessage = JSON.parse(msgString);
            if (parsedMessage.server !== 'limbo' && parsedMessage) {
                return minecraftClient.chat('\u00a7');
            } else if (parsedMessage.server === 'limbo') {
                return;
            }
        } catch (e) { }

        // CONSOLE LOG
        if (!includesIgnored(msgString) && config.options.ingameChatConsoleLog) {
            console.log(message.toAnsi());
        }

        // INGAME CHAT LOG
        if (config.channels.ingameChatLog) {
            if (!includesIgnored(msgString.trim()) && msgString.trim().length > 0) {
                messagesCache.push(msgString.trim());
            }
        }

        // DISCORD CHAT LOG
        if (msgString === 'You cannot say the same message twice!') {
            const { react } = require('../discord/messageCreate.js');
            try {
                react(null, '⛔');
            } catch (e) { }
            return;
        }
        if ((msgString.startsWith('Guild >') || msgString.startsWith('Officer')) && msgString.includes(':')) {
            const { react } = require('../discord/messageCreate.js');

            const splitMessage = msgString.split(' ');
            const index = msgString.indexOf(':');
            const sentMsg = msgString.substring(index + 2);
            const messageAuthor = splitMessage[2]?.includes('[') ? splitMessage[3]?.replace(':', '') : splitMessage[2]?.replace(':', '');

            // INGAME COMMANDS
            if (sentMsg.trim().startsWith(config.ingameCommands.trigger)) {
                const cmd = sentMsg.trim().substring(config.ingameCommands.trigger.length).split(' ')[0].toLowerCase().replace("-", "");
                for (let command of minecraftClient?.commands) {
                    if (command.triggers(cmd)) {
                        command.execute(sentMsg, messageAuthor)
                            .catch(err => {
                                minecraftClient.chat(`/gc @${messageAuthor} ${err}`);
                            });
                        break;
                    }
                } // Old Command
                let parts = msgString.split(': ')[1].toLowerCase().split(' ')

                if (parts.length < 1)
                    return;
                if (['!s', '!stats'].includes(parts[0]))
                    parts.shift();
                if (parts.length < 1)
                    return;

                let stat = parts[0];
                if (stat.startsWith('!'))
                    stat = stat.substring(1);
                if (stat.startsWith('lb') || stat.startsWith('leaderboard')) {
                    getLeaderboard(message).then(reply => {
                        if (reply != null) {
                            minecraftClient.chat(`/gc @${reply}`);
                        }
                    }, reason => console.error(reason)).catch(e => console.log(e));
                    return;
                }
                let name = parts.length > 1 ? parts[1] : messageAuthor;
                let full = parts.length > 1 ? parts.slice(1).join(' ') : '';

                // Get the text thingys
                getInfoText(stat, name, full).then(reply => {
                    if (reply != null) {
                        minecraftClient.chat(`/gc @Stats: ${reply}`);
                        return;
                    }
                }, reason => console.error(reason)).catch(e => console.log(e));
            }

            if (splitMessage[2]?.includes(config.minecraft.ingameName) || splitMessage[3]?.includes(config.minecraft.ingameName)) {
                try {
                    react(sentMsg, '✅');
                } catch (e) { }

                if (!sentMsg.startsWith('@')) return;
            }

            let includedURLs = [];
            for (const url of sentMsg.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g) ||
                []) {
                if (await isValidLink(url)) {
                    includedURLs.push(url);
                }
            }

            if (msgString.startsWith('Guild')) {
                const bridgeChannel = discordClient.channels.cache.get(config.channels.guildIngameChat);
                if (bridgeChannel) {
                    await bridgeChannel.send({
                        files: [new MessageAttachment(generateMessageImage(msgStringColor.substring(10)), `${messageAuthor}.png`, {description: msgString})],
                    });

                    if (includedURLs.length > 0) {
                        await bridgeChannel.send({ content: includedURLs.join('\n'), allowedMentions: { parse: [] } });
                    }
                }
            } else {
                if (config.channels.officerIngameChat) {
                    const officerChannel = discordClient.channels.cache.get(config.channels.officerIngameChat);
                    if (officerChannel) {
                        await officerChannel.send({
                            files: [new MessageAttachment(generateMessageImage(msgStringColor.substring(12)), `${messageAuthor}.png`, {description: msgString})],
                        });

                        if (includedURLs.length > 0) {
                            await officerChannel.send({ content: includedURLs.join('\n'), allowedMentions: { parse: [] } });
                        }
                    }
                }
            }
        }
        if (isGuildEvent(msgString)) {
            const msg = msgString.includes('Guild >') ? msgStringColor.substring(12) : msgStringColor;
            const formattedMessage = isShortGuildEvent(msgString) ? msg : `§b${'-'.repeat(40)}\nn${msg}\nn§b${'-'.repeat(40)}`;
            const bridgeChannel = discordClient.channels.cache.get(config.channels.guildIngameChat);
            if (bridgeChannel) {
                await bridgeChannel.send({
                    files: [new MessageAttachment(generateMessageImage(formattedMessage), 'guildEvent.png')],
                });
            }
        }
        if (config.options.discordUseSlowCommand) {
            if (msgString.startsWith('Guild >') && msgString.includes('the chat throttle!') && !msgString.includes(':')) {
                const bridgeChannel = discordClient.channels.cache.get(config.channels.guildIngameChat);
                if (bridgeChannel) {
                    if (msgString.includes('enabled')) {
                        await bridgeChannel.setRateLimitPerUser(10);
                    } else {
                        await bridgeChannel.setRateLimitPerUser(config.options.discordDefaultSlow || 0);
                    }
                }
            }
        }

        // GUILD REQUIREMENT MANAGMENT
        if (config.guildRequirement.enabled) {
            if (msgString.includes('has requested to join the Guild!') && !msgString.includes('Guild >')) {
                for (const m of message?.extra || []) {
                    const command = m?.clickEvent?.value;
                    if (command) {
                        const username = command.split(' ')[2];
                        const uuid = await nameToUUID(username);
                        if (uuid) {
                            const userRequirements = await getRequirements(uuid);
                            let requirementsMet = 0;
                            let requirementsMetSkyblock = 0;
                            let requirementsMetBedwars = 0;
                            let requirementsDescription = `${username}: `;
                            for (const [stat, requirement] of Object.entries(config.guildRequirement.requirements)) {
                                if (requirement instanceof Object && stat === 'slayer') {
                                    let slayerRequirementsMet = 0;
                                    const slayerDescription = [];
                                    for (const [slayerType, slayerLevel] of Object.entries(requirement)) {
                                        if ((userRequirements.slayer[slayerType] || 0) >= slayerLevel) {
                                            slayerRequirementsMet++;
                                        }
                                        slayerDescription.push(userRequirements.slayer[slayerType] || 0);
                                    }
                                    if (slayerRequirementsMet >= Object.keys(requirement).length) {
                                        requirementsMet++;
                                        requirementsMetSkyblock++;
                                    }
                                    requirementsDescription += `${stat.toUpperCase()}: ${slayerDescription.join('/')} ${slayerRequirementsMet >= Object.keys(requirement).length ? '✔' : '✖'
                                        } |`;
                                } else {
                                    if (userRequirements[stat] >= requirement) {
                                        requirementsMet++;
                                        if (!stat.includes('bw')) requirementsMetSkyblock++;
                                        else requirementsMetBedwars++;
                                        requirementsDescription += `${SHORT_STATS[stat]}: ${addCommas(userRequirements[stat]?.toFixed())} ✔|`;
                                    } else {
                                        requirementsDescription += `${SHORT_STATS[stat]}: ${addCommas(userRequirements[stat]?.toFixed())} ✖|`;
                                    }
                                }
                            }

                            minecraftClient.chat(`/oc ${requirementsDescription}`);
                            await sleep(1000);

                            let totalBwStats = 0;
                            for (const stat of Object.keys(config.guildRequirement.requirements)) {
                                if (stat.includes('bw')) {
                                    totalBwStats++;
                                }
                            }
                            if (
                                requirementsMet >=
                                (config.guildRequirement.minRequired || Object.keys(config.guildRequirement.requirements).length) ||
                                (config.guildRequirement.acceptEitherSkyblockOrBedwars &&
                                    (requirementsMetBedwars >= totalBwStats ||
                                        requirementsMetSkyblock >= Object.keys(config.guildRequirement.requirements).length - totalBwStats))
                            ) {
                                if (config.guildRequirement.autoAccept) {
                                    const blacklist = (config.guildRequirement.autoAcceptBlacklist || []).map((b) => b.toLowerCase());
                                    if (blacklist.includes(uuid.toLowerCase()) || blacklist.includes(username.toLowerCase())) {
                                        minecraftClient.chat(`/oc ${username} is blacklisted!`);
                                    } else {
                                        minecraftClient.chat(command);
                                    }
                                } else {
                                    minecraftClient.chat(`/oc ${username} meets the requirements!`);
                                }
                            } else {
                                minecraftClient.chat(`/oc ${username} has not met the requirements!`);
                            }

                            const { sendDiscordMessage } = require('../discord/ready');
                            const embed = getRequirementEmbed(userRequirements, username, true, uuid);
                            sendDiscordMessage({
                                channelId: config.channels.officerIngameChat,
                                messageObject: { embeds: [embed] },
                            });
                        }
                        break;
                    }
                }
            }
        }

        if (config.guildWelcome.enabled) {
            if (msgString.includes('joined the guild!') && !msgString.includes('Guild >')) {
                const username = msgString.startsWith('[') ? msgString.split(' ')[1] : msgString.split(' ')[0];
                minecraftClient.chat(`/gc ${config.guildWelcome.message.replace(/{USERNAME}/g, username)}`);
            }
        }

        // FRAG BOT (disable in config.fragBot.enabled)
        if (config.fragBot.enabled) {
            if (msgString.includes('has invited you to join their party!') && message.extra) {
                for (const m of message.extra) {
                    const command = m?.clickEvent?.value;
                    if (command) {
                        let whiteList = config.fragBot.whitelist;
                        if (config.fragBot.whitelistGuildMembers) {
                            const guildMembers = JSON.parse(fs.readFileSync('./data/guildMembers.json').toString());
                            whiteList = whiteList.concat(guildMembers);
                        }

                        const { 2: playerName } = command.split(' ');
                        if (whiteList.includes(playerName) || !config.fragBot.whitelistEnabled) {
                            fragBotQueue.push(playerName);
                            setTimeout(() => {
                                const index = fragBotQueue.indexOf(playerName);
                                if (index > -1) {
                                    fragBotQueue.splice(index, 1);
                                }
                            }, 1000 * 60); // 1 minute until timeout
                            if (fragBotQueue.length > 1) {
                                await minecraftClient.chat(
                                    `/w ${playerName} ${config.fragBot.addedToQueueMessage}`.replace('{WAIT_TIME}', (fragBotQueue.length - 1) * 7)
                                );
                            }
                            queue(minecraftClient);
                        }
                        break;
                    }
                }
            } else if (
                (msgString.includes('You left the party.') && !msgString.includes(':')) ||
                ((msgString.includes('That party has been disbanded') ||
                    msgString.includes("You don't have an invite to that player's party.") ||
                    msgString.includes('The party was disbanded')) &&
                    !msgString.includes(':'))
            ) {
                queue(minecraftClient);
            }
        }
    },
};

async function queue(minecraftClient) {
    if (isInFragParty) return;
    if (fragBotQueue.length < 1) {
        return (isInFragParty = false);
    }

    isInFragParty = true;
    const playerName = fragBotQueue[0];
    await sleep(1000);
    await minecraftClient.chat(`/p accept ${playerName}`);
    await sleep(1000);
    await minecraftClient.chat(`/pc ${config.fragBot.partyWelcomeMessage}`);
    await sleep(5000);
    const index = fragBotQueue.indexOf(playerName);
    if (index > -1) fragBotQueue.splice(index, 1);
    await minecraftClient.chat('/p leave');
    isInFragParty = false;
}

async function isValidLink(url) {
    if (url.includes('http') || url.includes('https')) {
        try {
            const res = await axios.get(url);
            if (res.status === 200) {
                return true;
            }
        } catch (e) {
            return false;
        }
    }
    return false;
}
