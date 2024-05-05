const config = require('../config.json');
const sourcebin = require('sourcebin');
const BaseCommand = require('./baseCommand.js');

class PasteCommand extends BaseCommand {

    constructor() {
        super('paste');
    }

    execute = async (message, messageAuthor) => {
        const paste = message.split(' ').slice(1).join(' ');
        if (paste.length < 1)
            return this.sendReply(`@${messageAuthor} You must provide a paste to paste.`);

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
            );

        return this.sendReply(`${messageAuthor} ${bin.url}`);
    }
}


module.exports = new PasteCommand();
