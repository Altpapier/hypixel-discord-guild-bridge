const { getPlayer, numberformatter } = require('../helper/functions.js');
const BaseCommand = require('./baseCommand.js');

class MuteCommand extends BaseCommand {

    constructor() {
        super('mute');
    }

    execute = async (message, messageAuthor) => {
        let { username, profile } = this.getArgs(message, messageAuthor);
        if (message.split(' ').length < 2) {
            this.sendReply(`${messageAuthor} put a name in silly >:)`)
            return
        }
        
        await console.log(message)

        let num = Math.floor(Math.random() * 9);
        if (num <= 1 && username != 'everyone'){
            this.runCommand(`g mute ${username} 1h`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.sendReply(`${messageAuthor} rolled a ${num} L ${username}`)
        } else {
            
            this.runCommand(`g mute ${messageAuthor} 1h`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            this.sendReply(`${messageAuthor} rolled a ${num} gn`)
        }
    }
}

module.exports = new MuteCommand();
