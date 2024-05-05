const { getPlayer, getTimeString } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class FairySoulsCommand extends BaseCommand {

    constructor() {
        super('cakes');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;
        if (!playerProfile?.temp_stat_buffs?.length)
            return this.sendReply(`${username} has no cake buffs active`);
        return this.sendReply(`The cake buffs for ${username} expire in ${getTimeString(playerProfile?.temp_stat_buffs[0].expire_at - Date.now())}`)
    }
}

module.exports = new FairySoulsCommand();