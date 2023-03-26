const { getRequirements, getRequirementEmbed, LONG_STATS } = require('../helper/requirements.js');
const { nameToUUID, createCollector, n, addCommas } = require('../helper/functions.js');
const { Constants, MessageButton, MessageActionRow, MessageEmbed } = require('discord.js');
const { STRING } = Constants.ApplicationCommandOptionTypes;
const { errorEmbed } = require('../helper/embeds.js');
const config = require('../config.json');

const REQUIREMENT_BUTTON = new MessageActionRow().addComponents(
    new MessageButton().setCustomId('requirements').setLabel('Guild Requirements').setStyle('SECONDARY')
);

module.exports = {
    name: 'requirements',
    description: 'Check if player meets the guild requirements',
    options: [
        {
            name: 'player',
            description: 'Player name',
            type: STRING,
            required: true,
        },
    ],
    async execute(discordClient, interaction) {
        const player = interaction.options.get('player')?.value;

        const uuid = await nameToUUID(player);
        if (uuid) {
            const requirementData = await getRequirements(uuid).catch((err) => {
                return interaction.editReply({ embeds: [errorEmbed(null, err.message)] });
            });

            const requirementEmbed = getRequirementEmbed(requirementData, player, false, uuid);

            const reply = await interaction.editReply({ embeds: [requirementEmbed], components: [REQUIREMENT_BUTTON] });

            const callback = async (i) => {
                if (i.customId === 'requirements') {
                    await interaction.followUp({
                        embeds: [
                            new MessageEmbed().setColor('BLURPLE').setDescription(
                                n(`
                            **Guild Requirements**:
                            ${config.guildRequirement.minRequired ? `**Minimum Required**: \`${config.guildRequirement.minRequired}\`\n` : ''}
                            ${Object.entries(config.guildRequirement.requirements)
                                .map(([name, value]) => {
                                    if (value instanceof Object) {
                                        //SLAYER
                                        const map = Object.values(value).map((val) => {
                                            return val;
                                        });
                                        return `**${LONG_STATS[name]}**: \`${map.join('/')}\``;
                                    } else if (!isNaN(value)) {
                                        return `**${LONG_STATS[name]}**: \`${addCommas(value)}\``;
                                    }
                                })
                                .join('\n')}
                        `)
                            ),
                        ],
                        ephemeral: true,
                    });
                }
            };

            createCollector({ interaction, reply, callback });
        } else {
            return interaction.editReply({ embeds: [errorEmbed(null, `Could not find player \`${player}\``)] });
        }
    },
};
