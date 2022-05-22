const { MessageEmbed } = require('discord.js');

function errorEmbed(title, message) {
    return new MessageEmbed()
        .setTitle(title || 'Error')
        .setDescription(message || 'An error has occurred.')
        .setColor('RED');
}

module.exports = {
    errorEmbed,
};
