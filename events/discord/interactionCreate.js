const { errorEmbed } = require('../../helper/embeds');

module.exports = {
    execute: async (minecraftClient, discordClient, interaction) => {
        if (interaction.user.bot) return;
        if (!interaction.guildId) return; // DMs
        if (interaction.type !== 'APPLICATION_COMMAND') return;

        const cmd = interaction.commandName;
        const command = discordClient.commands.get(cmd);
        if (!command) return;
        await interaction.deferReply();

        command.execute(minecraftClient, discordClient, interaction).catch((e) => {
            console.error(e);
            return interaction.editReply({
                embeds: [errorEmbed(null, 'An error occurred while executing this command.')],
            });
        });
    },
};
