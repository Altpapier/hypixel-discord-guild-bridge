const { MessageEmbed } = require('discord.js');
const { n } = require('../helper/functions');
const fs = require('fs');

module.exports = {
    name: 'members',
    description: 'Check the members of the bots guild',
    options: [],
    async execute(discordClient, interaction) {
        const gexpData = JSON.parse(fs.readFileSync('./data/guildGexp.json'));

        const ranks = {};
        for (const [member, data] of Object.entries(gexpData)) {
            if (data.isInGuild) {
                if (!ranks[data.rank]) ranks[data.rank] = [];
                ranks[data.rank].push(`\`${member}\``);
            }
        }

        const sortedRanks = Object.keys(ranks).sort((a, b) => ranks[a].length - ranks[b].length);
        const totalMembers = Object.values(gexpData).filter((data) => data.isInGuild).length;

        return interaction.editReply({
            embeds: [
                new MessageEmbed()
                    .setTitle('Guild Members')
                    .setColor('BLURPLE')
                    .setDescription(
                        n(`Total Members: \`${totalMembers}\` / \`125\`\n
                        
                        ${sortedRanks
                            .map((rank) => {
                                return `**${rank}**:\n${ranks[rank].join(', ')}`;
                            })
                            .join('\n\n')}`)
                    ),
            ],
        });
    },
};
