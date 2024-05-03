const config = require('../config.json');
const { getPlayer, decodeData } = require('../helper/functions.js');
const { renderLore } = require('../helper/loreRenderer');
const imgur = require('imgur-anonymous-uploader');
const BaseCommand = require('./baseCommand.js');

class RenderCommand extends BaseCommand {
    
    constructor() {
        super('render');
    }

    execute = async (message, messageAuthor) => {
        if (config.keys.imgurClientId) {
            const uploader = new imgur(config.keys.imgurClientId);

            let { 1: username, 2: profile, 3: itemNumber } = message.split(' ');

            if (!username) username = messageAuthor;

            if (!isNaN(Number(profile))) {
                itemNumber = profile;
            }
            if (!isNaN(Number(username))) {
                itemNumber = username;
                username = messageAuthor;
            }

            if (itemNumber < 1 || itemNumber > 9 || !itemNumber)
                return this.sendReply(`/gc @${messageAuthor} Invalid item number. Must be between 1 and 9.`);

            const searchedPlayer = await getPlayer(username, profile);
            const playerProfile = searchedPlayer.memberData;

            const inventory = playerProfile?.inv_contents?.data;
            if (!inventory) {
                return this.sendReply(`${username} has no items in their inventory or has their inventory API disabled.`);
            }

            const inventoryData = (await decodeData(Buffer.from(inventory, 'base64'))).i;
            const selectedItem = inventoryData[itemNumber - 1];
            if (!selectedItem || !Object.keys(selectedItem || {}).length) {
                return this.sendReply(`@${messageAuthor} This player does not have an item in slot ${itemNumber}.`);
            }

            const renderedItem = await renderLore(selectedItem?.tag?.display?.Name, selectedItem?.tag?.display?.Lore);

            const uploadResponse = await uploader.uploadBuffer(renderedItem);
            if (!uploadResponse.url) return this.sendReply(`@${messageAuthor} Failed to upload image.`);

            this.sendReply(`${messageAuthor} ${uploadResponse.url}`);
        }
    }
}

module.exports = new RenderCommand();
