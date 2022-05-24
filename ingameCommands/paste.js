const config = require('../config.json');
const sourcebin = require('sourcebin');

module.exports = {
    name: 'paste',
    execute: async (discordClient, message, messageAuthor) => {
        if (config.ingameCommands.paste) {
            const paste = message.split(' ').slice(1).join(' ');
            if (paste.length < 1) return minecraftClient.chat(`/gc @${messageAuthor} You must provide a paste to paste.`);

            const bin = await sourcebin
                .create(
                    [
                        {
                            content: paste,
                            language: 'text',
                        },
                    ],
                    {
                        title: `${messageAuthor}'s Paste`,
                    }
                )
                .catch((err) => {
                    return minecraftClient.chat(`/gc @${messageAuthor} ${err}`);
                });

            return minecraftClient.chat(`/gc @${messageAuthor} ${bin.url}`);
        }
    },
};
