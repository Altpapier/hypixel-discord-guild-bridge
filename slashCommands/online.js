const { errorEmbed } = require('../helper/embeds');
const { sleep, n } = require('../helper/functions');
const { getLatestMessages } = require('../events/minecraft/message');
const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'online',
    description: 'Check the online members of the bots guild',
    options: [],
    async execute(discordClient, interaction) {
        if (minecraftClient?.player) {
            await minecraftClient.chat('/g online');

            let timeoutIndex = 0;
            while (!includesOnlineCommand(getLatestMessages())) {
                await sleep(500);
                timeoutIndex++;
                if (timeoutIndex >= 10) {
                    return interaction.editReply({
                        embeds: [errorEmbed(null, '`/g online` timed out')],
                    });
                }
            }

            const onlineCommand = includesOnlineCommand(getLatestMessages());

            const totalMembers = onlineCommand.at(-3).split(':')[1].trim();
            const onlineMembers = onlineCommand.at(-2).split(':')[1].trim();
            const offlineMembers = onlineCommand.at(-1).split(':')[1].trim();

            let online = [];
            for (const [index, item] of Object.entries(onlineCommand)) {
                if (item.includes('-- ')) {
                    const nextLine = onlineCommand[parseInt(index) + 1];
                    if (nextLine) {
                        if (nextLine.includes('●')) {
                            online = online.concat(nextLine.split('●').map((item) => item.trim()));
                        }
                    }
                }
            }

            online = online.filter((item) => item);
            for (const item in online) {
                if (online[item].includes('[')) {
                    online[item] = online[item].split(' ')[1];
                }
            }

            return interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setTitle('Online Members')
                        .setColor('BLURPLE')
                        .setDescription(
                            n(`
                            Total Members: \`${totalMembers}\` / \`125\`
                            Online Members: \`${onlineMembers}\`
                            Offline Members: \`${offlineMembers}\`

                            **Online**:
                            ${online
                                .map((item) => {
                                    return `\`${item}\``;
                                })
                                .join(', ')}
                        `)
                        ),
                ],
            });
        } else {
            return interaction.editReply({
                embeds: [errorEmbed(null, 'Minecraft bot is currently not online')],
            });
        }
    },
};

function includesOnlineCommand(array) {
    let includes = 0;
    for (const item of array) {
        if (
            item.includes('Guild Name:') ||
            item.includes('Total Members:') ||
            item.includes('Online Members:') ||
            item.includes('Offline Members:')
        ) {
            includes++;
        }
    }
    if (includes == 4) {
        const indexGuildName = array.findIndex((item) => item.includes('Guild Name:'));
        const indexOfflineMembers = array.findIndex((item) => item.includes('Offline Members:'));

        return array.slice(indexGuildName, indexOfflineMembers + 1);
    }
    return false;
}
