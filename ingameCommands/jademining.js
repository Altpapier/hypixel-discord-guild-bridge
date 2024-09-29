const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class JadeMiningCommand extends BaseCommand {

    constructor() {
        super('jademining');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

    
        this.sendReply(`${username} has ${playerProfile.mining_core?.crystals?.jade_crystal?.total_placed || 0} jade crystals placed.`)
    }
}

module.exports = new JadeMiningCommand();
