const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class IronmanCommand extends BaseCommand {

    constructor() {
        super('ironman');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);
        // ♿
        let random = Math.floor(Math.random() * 99) + 1
        this.sendReply(`${username} is ${random}% ironman ${"♿".repeat(Math.floor(random/10) + 1)}`)
    }
}

module.exports = new IronmanCommand();
