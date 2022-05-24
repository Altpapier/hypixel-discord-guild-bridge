const { hypixelRequest, n, addCommas } = require('../helper/functions');
const { errorEmbed } = require('../helper/embeds');
const { MessageEmbed } = require('discord.js');

module.exports = {
    name: 'info',
    description: 'Check the info of the bots guild',
    options: [],
    async execute(discordClient, interaction) {
        const botUUID = minecraftClient.player.uuid;
        const guild = (await hypixelRequest(`https://api.hypixel.net/guild?player=${botUUID}`, true))?.guild;
        if (!guild) {
            return interaction.editReply({
                embeds: [errorEmbed(null, 'Could not get guild info')],
            });
        }

        return interaction.editReply({
            embeds: [
                new MessageEmbed()
                    .setTitle(`${guild.name} Info`)
                    .setColor('BLURPLE')
                    .setDescription(
                        n(`
                        Created: <t:${(guild.created / 1000).toFixed()}>
                        EXP: \`${addCommas(guild.exp)}\`
                        Members: \`${guild.members.length}\` / \`125\`
                        Description: \`${guild.description}\`
                        Tag: \`${guild.tag || 'None'}\`
                        Joinable: \`${guild.joinable ? 'Yes' : 'No'}\`
                    `)
                    ),
            ],
        });
    },
};
