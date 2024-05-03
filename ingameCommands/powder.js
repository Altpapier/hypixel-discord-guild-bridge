const { addCommas, getPlayer } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class PowderCommand extends BaseCommand {

    constructor() {
        super('powder');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        const mithril = (playerProfile?.mining_core?.powder_mithril || 0) + (playerProfile?.mining_core?.powder_spent_mithril || 0);
        const gemstone = (playerProfile?.mining_core?.powder_gemstone || 0) + (playerProfile?.mining_core?.powder_spent_gemstone || 0);
        return this.sendReply(`${username} has a total of ${addCommas(mithril)} mithril powder and ` +
            `${addCommas(gemstone)} gemstone powder`);
    }
}

module.exports = new PowderCommand();