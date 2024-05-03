const { addCommas, getPlayer } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js')

class CandyCommand extends BaseCommand {

    constructor() {
        super('candy');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        let candy = playerProfile?.pets.reduce((prev, pet) => prev + (pet?.candyUsed || 0), 0);

        return this.sendReply(`${username} used a total of ${addCommas(candy)} candy on their pets`);
    }
}

module.exports = new CandyCommand()