const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class testCommand extends BaseCommand {

    constructor() {
        super('test');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        this.sendReply(`${message}`)
    }
}

module.exports = new testCommand();
