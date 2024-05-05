const { farmingContests, getTimeString } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class FarmingContestCommand extends BaseCommand {

    constructor(command, apiKey) {
        super(command);
        this.apiKey = apiKey;
        this.crop = apiKey.toLowerCase();
    }

    execute = async (message, messageAuthor) => {
        const contests = await farmingContests();
        let contest = {
            time: 100000000000000,
            crops: ["No Data", "No Data", "No Data"]
        }
        for (let c of contests) {
            if (c.time > Date.now() / 1000 && c.crops.includes(this.apiKey)) {
                contest = c;
                break;
            }
        }
        return this.sendReply(`Next ${this.crop} contest in ${getTimeString(1000 * contest.time - (Date.now()))}`);
    }
}

class JacobContestCommand extends BaseCommand {

    constructor() {
        super("jacobcontest");
    }

    execute = async (message, messageAuthor) => {
        const contests = await farmingContests();
        let contest = {
            time: 100000000000000,
            crops: ["No Data", "No Data", "No Data"]
          }
          for (let c of contests) {
            if (c.time > Date.now() / 1000) {
              contest = c;
              break;
            }
          }
          return this.sendReply(`Next jacob contest crops: ${contest.crops[0]}, ${contest.crops[1]} and ${contest.crops[2]} in ${getTimeString(1000 * contest.time - (Date.now()))}`)
    }
}

module.exports = [
    new FarmingContestCommand("pumpkincontest", "Pumpkin"),
    new FarmingContestCommand("meloncontest", "Melon"),
    new FarmingContestCommand("mushroomcontest", "Mushroom"),
    new FarmingContestCommand("cocoabeanscontest", "Cocoa Beans"),
    new FarmingContestCommand("cactuscontest", "Cactus"),
    new FarmingContestCommand("sugarcanecontest", "Sugar Cane"),
    new FarmingContestCommand("potatocontest", "Potato"),
    new FarmingContestCommand("carrotcontest", "Carrot"),
    new FarmingContestCommand("wheatcontest", "Wheat"),
    new FarmingContestCommand("netherwartcontest", "Nether Wart"),
    new JacobContestCommand()
]