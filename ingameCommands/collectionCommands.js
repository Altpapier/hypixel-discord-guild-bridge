const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class CollectionCommand extends BaseCommand {

    constructor(collection, key, { name, coop } = { coop: false }) {
        super(collection);
        this.crop = name || collection
        this.key = key || collection;
        this.coop = coop;
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);

        const searchedPlayer = await getPlayer(username, profile);
        const playerProfile = searchedPlayer.memberData;

        if (!('collection' in playerProfile)) return this.sendReply(`${username} did not enable collection API`);
        const amount = playerProfile?.collection[this.key] || 0;
        const total = Object.values(searchedPlayer.profileData.members || {}).reduce((prev, p) => prev + (p?.collection?.[this.key] || 0), 0);

        return this.sendReply(`${username} collected ${numberformatter(amount, 3)} ${this.crop}` + (this.coop ? ` (${numberformatter(total, 3)} total)` : ''));
    }
}

module.exports = [
    //new CollectionCommand('gold', 'GOLD_INGOT'),
    new CollectionCommand('gemstones', 'GEMSTONE_COLLECTION'),
    new CollectionCommand('magmafish', 'MAGMA_FISH'),
    new CollectionCommand('chilipeppers', 'CHILI_PEPPER'),
    new CollectionCommand('cocoabeans', 'INK_SACK:3', { name: 'cocoa beans', coop: true }),
    new CollectionCommand('potatoes', 'POTATO_ITEM', { coop: true }),
    new CollectionCommand('carrots', 'CARROT_ITEM', { coop: true }),
    new CollectionCommand('cactus', 'CACTUS', { coop: true }),
    new CollectionCommand('mushrooms', 'MUSHROOM_COLLECTION', { coop: true }),
    new CollectionCommand('wheat', 'WHEAT', { coop: true }),
    new CollectionCommand('pumpkin', 'PUMPKIN', { coop: true }),
    new CollectionCommand('melon', 'MELON', { coop: true }),
    new CollectionCommand('sugarcane', 'SUGAR_CANE', { name: 'sugar cane', coop: true }),
    new CollectionCommand('netherwarts', 'NETHER_STALK', { name: 'nether warts', coop: true }),
    new CollectionCommand('mithril', 'MITHRIL_ORE', { name: 'mithril', coop: true }),
    new CollectionCommand('umber', 'UMBER', { name: 'umber', coop: true }),
    new CollectionCommand('tungsten', 'TUNGSTEN', { name: 'tungsten', coop: true }),
];
