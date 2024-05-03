
const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class RizzCommand extends BaseCommand {

    constructor() {
        super('rizz');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);
        this.sendReply(`${username} has ${Math.floor(Math.random() * 101)}/100 rizz`)
    }
}

module.exports = new RizzCommand();
