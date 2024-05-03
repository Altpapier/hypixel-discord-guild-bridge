const { getPlayer, addCommas } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js')

class TrophyFishCommand extends BaseCommand {

    constructor() {
        super('trophy');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        const bronzeSet = new Set();
        const silverSet = new Set();
        const goldSet = new Set();
        const diamondSet = new Set();

        for (let fish in playerProfile?.trophy_fish) {
            if (fish.endsWith('bronze')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
            } else if (fish.endsWith('silver')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
                silverSet.add(trophyFishName);
            } else if (fish.endsWith('gold')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
                silverSet.add(trophyFishName);
                goldSet.add(trophyFishName);
            } else if (fish.endsWith('diamond')) {
                let trophyFishName = fish.split('_').slice(0, -1).join('_');
                bronzeSet.add(trophyFishName);
                silverSet.add(trophyFishName);
                goldSet.add(trophyFishName);
                diamondSet.add(trophyFishName);
            }
        }

        const bronzeCount = bronzeSet.size;
        const silverCount = silverSet.size;
        const goldCount = goldSet.size;
        const diamondCount = diamondSet.size;

        const totalTrophyFish = playerProfile?.stats?.items_fished_trophy_fish || 0;

        let detailMessage = "";
        if (bronzeCount < 15) {
            detailMessage = `(${bronzeCount}/15 to bronze)`;
        } else if (silverCount < 18) {
            detailMessage = `(${silverCount}/18 to silver)`;
        } else if (goldCount < 18) {
            detailMessage = `(${goldCount}/18 to gold)`;
        } else if (diamondCount < 18) {
            detailMessage = `(${diamondCount}/18 to diamond)`;
        }

        return this.sendReply(`${username} fished up ${addCommas(totalTrophyFish)} trophy fish ${detailMessage}`)
    }
}

module.exports = new TrophyFishCommand()