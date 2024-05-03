const { getGuildMemberData, n } = require('../helper/functions');
const { Constants, MessageEmbed } = require('discord.js');
const { STRING } = Constants.ApplicationCommandOptionTypes;
const { errorEmbed } = require('../helper/embeds');
const fs = require('fs');

module.exports = {
    name: 'link',
    description: 'Links your account to the guild in order to display your guild rank',
    options: [
        {
            name: 'player',
            description: 'Player name',
            type: STRING,
            required: true,
        },
    ],
    async execute(discordClient, interaction) {
        const playerData = await getGuildMemberData(interaction.options.get('player')?.value).catch((err) => {
            return interaction.editReply({
                embeds: [errorEmbed(null, err.message)],
            });
        });

        const discordLink = playerData?.player?.socialMedia?.links?.DISCORD;

        if (!discordLink || discordLink !== interaction.user.username) {
            return interaction.editReply({
                embeds: [
                    errorEmbed(
                        null,
                        n(
                            `This player\'s discord link on hypixel does not match yours. Join Hypixel and do the following steps in order to set/update your discord links:
                            
                            1. Click on \`My Profile (Right Click)\` in a Hypixel lobby
                            2. Click on \`Social Media\`
                            3. Left-click on \`Discord\`
                            4. Paste this in the Minecraft ingame chat: \`${interaction.user.tag}\``
                        )
                    ),
                ],
            });
        }

        const links = JSON.parse(fs.readFileSync('./data/guildLinks.json'));
        const linkUsernames = JSON.parse(fs.readFileSync('./data/guildLinkUsernames.json'));
        const wasLinkedBefore = links[interaction.user.id];
        links[interaction.user.id] = playerData?.uuid;
        linkUsernames[interaction.user.id] = playerData?.player.displayname;
        fs.writeFileSync('./data/guildLinks.json', JSON.stringify(links, null, 2));
        fs.writeFileSync('./data/guildLinkUsernames.json', JSON.stringify(linkUsernames, null, 2));

        return interaction.editReply({
            embeds: [
                new MessageEmbed()
                    .setTitle('Success')
                    .setColor('BLURPLE')
                    .setDescription(
                        n(`
                    You have successfully ${
                        wasLinkedBefore ? 'updated' : 'set'
                    } your discord link. You can now use the guild ingame chat with it displaying your guild rank and username.
                `)
                    ),
            ],
        });
    },
};
