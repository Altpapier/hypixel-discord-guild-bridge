const { addCommas, getPlayer } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js')

class DojoCommand extends BaseCommand {

    constructor() {
        super('dojo');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        const force = playerProfile?.nether_island_player_data?.dojo?.dojo_points_mob_kb || 0;
        const stamina = playerProfile?.nether_island_player_data?.dojo?.dojo_points_wall_jump || 0;
        const mastery = playerProfile?.nether_island_player_data?.dojo?.dojo_points_archer || 0;
        const discipline = playerProfile?.nether_island_player_data?.dojo?.dojo_points_sword_swap || 0;
        const swiftness = playerProfile?.nether_island_player_data?.dojo?.dojo_points_snake || 0;
        const tenacity = playerProfile?.nether_island_player_data?.dojo?.dojo_points_fireball || 0;
        const control = playerProfile?.nether_island_player_data?.dojo?.dojo_points_lock_head || 0;

        return this.sendReply(
          `Dojo highscores for ${username}: ${addCommas(force)} Force, ${addCommas(stamina)} Stamina, ${addCommas(mastery)} Mastery, ${addCommas(discipline)} Discipline, ${addCommas(swiftness)} Swiftness, ${addCommas(control)} Control, ${addCommas(tenacity)} Tenacity. Total score: ${addCommas(force + stamina + mastery + discipline + tenacity + swiftness + control)}`
        );
    }
}

module.exports = new DojoCommand()