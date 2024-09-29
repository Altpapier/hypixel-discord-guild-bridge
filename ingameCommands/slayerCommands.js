const BaseCommand = require('./baseCommand.js')
const { getPlayer, addCommas } = require('../helper/functions.js');
const { getSlayerLevel } = require("../helper/skills");

class SlayerCommand extends BaseCommand {

    constructor(slayer) {
        super(slayer);
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile)
        const playerProfile = searchedPlayer.memberData;

        const xp = playerProfile?.slayer?.slayer_bosses?.[this.name]?.xp || 0;

        const level = getSlayerLevel(xp);
        return this.sendReply(`${username} is ${this.name} slayer ${level} with ${addCommas(xp.toFixed())} xp`)
    }
}

module.exports = [
    //new SlayerCommand('zombie'),
    //new SlayerCommand('spider'),
    //new SlayerCommand('wolf'),
    //new SlayerCommand('enderman'),
    //new SlayerCommand('blaze'),
    new SlayerCommand('vampire')
]
