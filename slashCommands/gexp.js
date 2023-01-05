const { Constants, MessageEmbed } = require('discord.js');
const { STRING } = Constants.ApplicationCommandOptionTypes;
const { n, addCommas, toFixed, paginator } = require('../helper/functions.js');
const config = require('../config.json');
const fs = require('fs');

module.exports = {
    name: 'gexp',
    description: 'Guild Exp',
    options: [
        {
            name: 'player',
            description: 'Player name',
            type: STRING,
            required: false,
        },
    ],
    async execute(discordClient, interaction) {
        const playerInput = interaction.options.get('player')?.value;
        const gexpData = JSON.parse(fs.readFileSync('./data/guildGexp.json').toString());
        const lowerToNormal = {};
        for (const player of Object.keys(gexpData)) {
            lowerToNormal[player.toLowerCase()] = player;
        }

        if (Object.keys(gexpData).length > 0) {
            if (playerInput) {
                const playerData = gexpData[lowerToNormal[playerInput.toLowerCase()]];
                if (!playerData) return interaction.editReply({ content: 'Guild Member not found.' });

                const embeds = [];
                const pages = Number(toFixed((playerData.gexpHistory.length || 0) / 20)) + ((playerData.gexpHistory.length || 1) % 20 == 0 ? 0 : 1);
                for (let i = 0; i < pages; i++) {
                    const embed = new MessageEmbed()
                        .setTitle(`${lowerToNormal[playerInput.toLowerCase()]}'s Guild Exp`)
                        .setColor('BLURPLE')
                        .setDescription(
                            n(`
                                **In Guild**: \`${playerData.isInGuild ? 'Yes' : 'No'}\`
                                **Rank**: \`${playerData.rank}\`
                                **Joined**: <t:${(playerData.joined / 1000).toFixed()}>
                                **Guild Exp (Week)**: \`${addCommas(playerData.gexpWeek)}\`

                                **Guild Exp History**:
                                ${
                                    playerData.gexpHistory.length > 0
                                        ? playerData.gexpHistory
                                              .reverse()
                                              .slice(i * 20, i * 20 + 20)
                                              .map((history) => {
                                                  return `<t:${history.date}:d> \`${addCommas(history.gexp)}\``;
                                              })
                                              .join('\n')
                                        : 'None'
                                }
                        `)
                        )
                        .setFooter({ text: `Page ${i + 1} / ${pages}` });
                    embeds.push(embed);
                }

                paginator(interaction, embeds);
            } else {
                const embed = new MessageEmbed()
                    .setTitle('Guild Exp')
                    .setColor('BLURPLE')
                    .setDescription(
                        config.gexpManagment.weeklyGEXPRequirement
                            ? n(`
                            **Weekly GEXP Requirement**: \`${addCommas(config.gexpManagment.weeklyGEXPRequirement)}\`

                            **Members under the requirement**:
                            ${Object.keys(gexpData)
                                .filter((player) => gexpData[player].isInGuild)
                                .filter((player) => gexpData[player].gexpWeek < config.gexpManagment.weeklyGEXPRequirement)
                                .sort((a, b) => gexpData[a].gexpWeek - gexpData[b].gexpWeek)
                                .map((player) => {
                                    return `**${player}**: \`${addCommas(gexpData[player].gexpWeek)}\``;
                                })
                                .join('\n')}

                            **Members above the requirement**:
                            ${Object.keys(gexpData)
                                .filter((player) => gexpData[player].isInGuild)
                                .filter((player) => gexpData[player].gexpWeek >= config.gexpManagment.weeklyGEXPRequirement)
                                .sort((a, b) => gexpData[a].gexpWeek - gexpData[b].gexpWeek)
                                .map((player) => {
                                    return `**${player}**: \`${addCommas(gexpData[player].gexpWeek)}\``;
                                })
                                .join('\n')}
                         `)
                            : n(`
                                **Members**:
                                ${Object.keys(gexpData)
                                    .filter((player) => gexpData[player].isInGuild)
                                    .sort((a, b) => gexpData[b].gexpWeek - gexpData[a].gexpWeek)
                                    .map((player) => {
                                        return `**${player}**: \`${addCommas(gexpData[player].gexpWeek)}\``;
                                    })
                                    .join('\n')}
                                    
                         `)
                    );
                return interaction.editReply({
                    embeds: [embed],
                });
            }
        } else {
            return interaction.editReply({
                content: 'Guild GEXP data is empty.',
            });
        }
    },
};
