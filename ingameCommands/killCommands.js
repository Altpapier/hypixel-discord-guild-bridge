const { addCommas, getPlayer } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class KillCommand extends BaseCommand {

    constructor(mob, { key, display_name } = {}) {
        super(mob);
        this.key = key || mob;
        this.display_name = display_name || mob;
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        const amount = playerProfile?.player_stats?.kills[this.key] || 0;

        return this.sendReply(`${username} killed ${addCommas(amount)} ${this.display_name}`);
    }
}

module.exports = [
    //new KillCommand('yetis', { key: 'kills_yeti' }),
    //new KillCommand('ghosts', { key: 'kills_caverns_ghost' }),
   /* new KillCommand('inquisitors', {
        key: 'kills_minos_inquisitor',
        display_name: 'minos inquisitors'
    }),*/
    /*new KillCommand('kills', {
        key: 'kills',
        display_name: 'creatures'
    }),*/
    new KillCommand('flares', { key: 'flare', }),
    new KillCommand('vanquishers', { key: 'vanquisher', }),
]
