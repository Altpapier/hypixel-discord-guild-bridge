const config = require('../../config.json');
const { formatMentions } = require('../../helper/functions.js');
const messagesReactionCache = new Map();
const fs = require('fs');
const { getInfoText, getLeaderboard } = require('../../StatChecker.js');

const webhooks = [
    "1225614446509035581"
]

module.exports = {
    execute: async (discordClient, message) => {
        if ((message.author.bot && !webhooks.includes(message.author.id)) || message.content === '') return;


        if (message.content.startsWith('\\')) {
            message.content = message.content.substring(1);
        }

        if (message.channelId === config.channels.ingameChatLog) {
            return minecraftClient.chat(message.content);
        } else if (message.channelId === config.channels.guildIngameChat || message.channelId === config.channels.officerIngameChat) {
            const command = message.channelId === config.channels.officerIngameChat ? '/oc' : '/gc';
            const linkedPlayers = JSON.parse(fs.readFileSync('./data/guildLinks.json'));
            let playerRank;
            if (linkedPlayers[message.author.id]) {
                const linkUsernames = JSON.parse(fs.readFileSync('./data/guildLinkUsernames.json'));
                const allRanks = JSON.parse(fs.readFileSync('./data/guildRanks.json'));
                playerRank = allRanks[linkedPlayers[message.author.id]];

                if (linkUsernames[message.author.id]) {
                    message.author.username = linkUsernames[message.author.id];
                }
            }
            /*if (playerRank) {
                if (message.member.nickname) {
                    message.member.nickname += ` [${playerRank}]`;
                } else {
                    message.author.username += ` [${playerRank}]`;
                }
            }*/
            let messagePrefix = `${command} ${message.member?.nickname ?? message.author.username}: `;
            if (message.type === 'REPLY') {
                const repliedUser = message.mentions.repliedUser;
                if (repliedUser.id === discordClient.user.id) {
                    const mentionedChannel = discordClient.channels.cache.get(message.reference.channelId);
                    if (mentionedChannel) {
                        const mentionedMessage = await mentionedChannel.messages.fetch(message.reference.messageId);
                        const [attachment] = mentionedMessage.attachments.values();
                        if (attachment?.name) {
                            messagePrefix = `${command} ${message.member?.nickname ?? message.author.username} replied to ${attachment.name.slice(0, -4)}: `;
                            messagesReactionCache.set(mentionedMessage);
                        }
                    }
                } else {
                    messagePrefix = `${command} ${message.member?.nickname ?? message.author.username} replied to ${message.mentions.members.first()?.nickname ?? repliedUser.username}: `;
                }
            }

            message.content = await formatMentions(discordClient, message.content);
            message.content = message.content.replace(/\n/g, '');
            const msg = (messagePrefix + message.content).substring(0, 256);

            if ((messagePrefix + message.content).length >= 256) {
                const toDelete = await message.reply('This message was too long. Sending only the first 256 characters.');
                setTimeout(async () => {
                    await toDelete.delete();
                }, 5000);
            }
            if (config.options.messageSentConfirmation.failedReactions) {
                messagesReactionCache.set(msg.substring(4), message);
                setTimeout(() => {
                    if (messagesReactionCache.get(msg.substring(4))) {
                        react(msg.substring(4), '⛔');
                    }
                }, 1000 * 3);
            }

            minecraftClient.chat(msg);

            if (message.content.trim().startsWith(config.ingameCommands.trigger)) {
                const cmd = message.content.trim().substring(config.ingameCommands.trigger.length).split(' ')[0].toLowerCase().replace("-", "");
                for (let command of minecraftClient?.commands) {
                    if (command.triggers(cmd)) {
                        command.execute(message.content, message.author.username)
                            .catch(err => {
                                minecraftClient.chat(`/gc @${message.author.username} ${err}`);
                            });
                        break;
                    }
                }
            }

            let parts = message.content.toLowerCase().split(' ')

            if (parts.length < 1)
                return;
            if (['!s', '!stats'].includes(parts[0]))
                parts.shift();
            if (parts.length < 1)
                return;

            let stat = parts[0];
            if (stat.startsWith('!'))
                stat = stat.substring(1);
            else
                return;
            if (stat.startsWith('lb') || stat.startsWith('leaderboard')) {
                getLeaderboard(message).then(reply => {
                    if (reply != null) {
                        minecraftClient.chat(`/gc @${reply}`);
                    }
                }, reason => console.error(reason)).catch(e => console.log(e));
                return;
            }
            let name = parts.length > 1 ? parts[1] : message.author.username;
            let full = parts.length > 1 ? parts.slice(1).join(' ') : '';

            // Get the text thingys
            getInfoText(stat, name, full).then(reply => {
                if (reply != null) {
                    minecraftClient.chat(`/gc @Stats: ${reply}`);
                    return;
                }
            }, reason => console.error(reason)).catch(e => console.log(e));
        }

        async function react(messageSent, reaction) {
            if (config.options.messageSentConfirmation.checkmarkReactions || config.options.messageSentConfirmation.failedReactions) {
                let message = messagesReactionCache.get(messageSent);
                if (!messageSent) {
                    message = Array.from(messagesReactionCache)?.[(messagesReactionCache?.size || 0) - 1]?.[1];
                }
                if (message) {
                    if (
                        (config.options.messageSentConfirmation.checkmarkReactions && reaction === '✅') ||
                        (config.options.messageSentConfirmation.failedReactions && reaction === '⛔')
                    ) {
                        message.react(reaction);
                    }
                    messagesReactionCache.delete(messageSent);
                }
            }
        }

        module.exports = {
            react,
        };
    },
};
