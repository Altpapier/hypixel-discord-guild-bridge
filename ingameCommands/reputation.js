const { addCommas, getPlayer } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js')

class ReputationCommand extends BaseCommand {

    constructor() {
        super('reputation');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        const faction = playerProfile?.nether_island_player_data?.selected_faction
        const mage = playerProfile?.nether_island_player_data?.mages_reputation || 0;
        const barb = playerProfile?.nether_island_player_data?.barbarians_reputation || 0;
        return this.sendReply(faction ? `${username} is part of the ${faction === 'mages' ? 'mage' : 'barbarian'} faction with ` +
            `${addCommas(mage)} mage and ${addCommas(barb)} barbarian reputation` : `${username} is not part of any faction yet.`);
    }
}

module.exports = new ReputationCommand();