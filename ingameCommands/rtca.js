
const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class rtcaCommand extends BaseCommand {

    constructor() {
        super('rtca');
    }

    getRtca = async (username, author) => {
        let raw = await fetch("https://soopy.dev/api/soopyv2/botcommand?m=" + encodeURIComponent("rtca "+username) + "&u=" + author);
        let obj = await raw.text();
        return obj;
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);
        this.getRtca(username, messageAuthor).then(data => this.sendReply(data));
    }
}

module.exports = new rtcaCommand();
