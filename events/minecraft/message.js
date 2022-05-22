const axios = require('axios');
const fs = require('fs');
const { MessageAttachment } = require('discord.js');
const config = require('../../config.json');
const { formatDiscordMessage, includesIgnored, isGuildEvent, isShortGuildEvent, sleep, nameToUUID, addCommas } = require('../../helper/functions.js');
const generateMessageImage = require('../../helper/messageToImage.js');
const { getRequirements, getRequirementEmbed } = require('../../helper/requirements.js');

const SHORT_STATS = {
    lilyWeight: 'LILY',
    senitherWeight: 'SENI',
    skillAverage: 'SA',
    hypixelLevel: 'HLVL',
    catacombs: 'CATA',
    slayer: 'SLAYER',
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
    async execute(minecraftClient, discordClient, message) {
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
        } catch (e) {}

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
            } catch (e) {}
            return;
        }
        if ((msgString.startsWith('Guild >') || msgString.startsWith('Officer')) && msgString.includes(':')) {
            const { react } = require('../discord/messageCreate.js');

            const splitMessage = msgString.split(' ');
            const index = msgString.indexOf(':');
            const sentMsg = msgString.substring(index + 2);
            const messageAuthor = splitMessage[2]?.includes('[') ? splitMessage[3]?.replace(':', '') : splitMessage[2]?.replace(':', '');

            if (sentMsg.trim().startsWith('!')) {
                const cmd = sentMsg.trim().split(' ')[0].substring(1);
                const command = minecraftClient.commands.get(cmd);
                if (command) {
                    command.execute(minecraftClient, discordClient, sentMsg, messageAuthor);
                }
            }

            if (splitMessage[2]?.includes(config.minecraft.ingameName) || splitMessage[3]?.includes(config.minecraft.ingameName)) {
                try {
                    react(sentMsg, '✅');
                } catch (e) {}

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
                        files: [new MessageAttachment(generateMessageImage(msgStringColor.substring(10)), `${messageAuthor}.png`)],
                    });

                    if (includedURLs.length > 0) {
                        await bridgeChannel.send(includedURLs.join('\n'));
                    }
                }
            } else {
                if (config.channels.officerIngameChat) {
                    const officerChannel = discordClient.channels.cache.get(config.channels.officerIngameChat);
                    if (officerChannel) {
                        await officerChannel.send({
                            files: [new MessageAttachment(generateMessageImage(msgStringColor.substring(12)), `${messageAuthor}.png`)],
                        });

                        if (includedURLs.length > 0) {
                            await officerChannel.send(includedURLs.join('\n'));
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
                        await bridgeChannel.setRateLimitPerUser(0);
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
                                    if (slayerRequirementsMet >= Object.keys(requirement).length) requirementsMet++;
                                    requirementsDescription += `${stat.toUpperCase()}: ${slayerDescription.join('/')} ${
                                        slayerRequirementsMet >= Object.keys(requirement).length ? '✔' : '✖'
                                    } |`;
                                } else {
                                    if (userRequirements[stat] >= requirement) {
                                        requirementsMet++;
                                        requirementsDescription += `${SHORT_STATS[stat]}: ${addCommas(userRequirements[stat]?.toFixed())} ✔|`;
                                    } else {
                                        requirementsDescription += `${SHORT_STATS[stat]}: ${addCommas(userRequirements[stat]?.toFixed())} ✖|`;
                                    }
                                }
                            }

                            minecraftClient.chat(`/oc ${requirementsDescription}`);
                            await sleep(1000);

                            if (
                                requirementsMet >= (config.guildRequirement.minRequired || Object.keys(config.guildRequirement.requirements).length)
                            ) {
                                if (config.guildRequirement.autoAccept) {
                                    minecraftClient.chat(command);
                                } else {
                                    minecraftClient.chat(`/oc ${username} meets the requirements!`);
                                }
                            } else {
                                minecraftClient.chat(`/oc ${username} has not met the requirements!`);
                            }

                            const { sendDiscordMessage } = require('../discord/ready');
                            const embed = getRequirementEmbed(userRequirements, username, true);
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
