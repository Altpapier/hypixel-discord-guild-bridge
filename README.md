# Hypixel Discord Guild Bridge

If you have any suggestions or bugs you find using this bot, make sure to submit them [here](https://github.com/Altpapier/hypixel-discord-guild-bridge/issues)

## Table of Content

-   [Features](#features)
-   [Installing](#installing)
    -   [Requirements](#requirements)
    -   [Setup](#setup)
-   [Configurations](#configurations)

## Features

### Guild Ingame Chat & Officer Ingame Chat

Colored Minecraft Chat in Discord using images. This will also send guild events when a new guild member joins for example. The bot will send links in the channel as well.

![description](https://imgur.com/MQXUVEx.png)
![description](https://imgur.com/cvGiK5q.png)

### Reply to Messages

![description](https://imgur.com/z1xxyk6.png)
![description](https://imgur.com/1NCuo7S.png)

### Message Sent Reactions

Know if a message was successfully sent into the guild chat or not

![description](https://imgur.com/HUnTMrn.png)

### Account Linking

Link your Minecraft account to the Discord bot using the `/link` slash command for your guild rank and Minecraft username to be displayed when sending messages in the guild in game chat Discord channel

![description](https://imgur.com/AmhJIfQ.png)

### Log Channel

Logs every message the bot receives

![description](https://imgur.com/6KWFsfS.png)

### Guild EXP Managment

Get a list of every guild member that does not meet the guild experience requirement. If a guild member is provided in the `player` argument, you can view the players past weeks guild experience even if they are not in the guild anymore and more!

![description](https://imgur.com/s8TOU3L.png)![description](https://imgur.com/H51DkH8.png)

### Guild Requirement Manager

Send a message into officer in game and discord chat if a player who requested to join the guild meets the configured requirements! Also supports auto accept if the player does meet the requirement. Players can check if they meet the requirements using the `/requirements` command in Discord

![description](https://imgur.com/MT9rqqs.png)

### Auto Welcome

The bot can also automatically welcome new members to the guild. This message can be customized or disabled in the configuration file

### Frag Bot (Use at your own risk!)

The bot also includes an integrated frag bot that can be used by the guild. The bot supports an option to automatically whitelist all guild members.

![description](https://imgur.com/yQN2QBO.png)

### Ingame Commands

() = required, [] = optional
|Command|Feature|Syntax|Example|Response|
|--|--|--|--|--|
|`paste`|Will take the text from a user and upload it to a text file which can then be used for other guild members to copy paste that text. | `!paste (text)` | `!paste /replay 876a856e-197c-4e2f-bdd7-00dc44a7e326 #b5788d24` | `https://sourceb.in/z5Mb5rG8fp`|
|`render`| Will take an inventory slot out of a player's inventory and render that players image and upload that one to Imgur. `imgurClientId` required.|`!render [player] [profile] (slot)`| `!render Refraction 1`|![description](https://i.imgur.com/LQbj06Q.png)|
|`skills`| Will return a player's skill average| `!skills [player] [profile]`|`!skills Altpapier`| `Altpapier's skill average is 48.56` |
|`weight`| Will return a player's senither and lily weight| `!weight [player] [profile]`|`!weight Altpapier`|`Altpapier has 8,375 senither weight and 12,202 lily weight.` |
|`networth`| Will return a player's networth|`!networth/nw [player] [profile]`|`!networth Altpapier`|`Altpapier's networth is 3,703,575,174`

### Slash Commands

| Command        | Response                                                    |
| -------------- | ----------------------------------------------------------- |
| `gexp`         | [Guild EXP Managment Feature (click)](#guild-exp-managment) |
| `info`         | ![description](https://imgur.com/qSmz0ZK.png)               |
| `link`         | ![description](https://imgur.com/AmhJIfQ.png)               |
| `members`      | ![description](https://imgur.com/sqVpjj7.png)               |
| `online`       | ![description](https://imgur.com/S30Ojbk.png)               |
| `requirements` | ![description](https://imgur.com/pxzIbct.png)               |

### API

The included API can be used to send post requests to execute commands or send messages. More on that at the 10th point of the [Configurations](#configurations) chapter.

### Other small features

-   Mentioning a certain member, channel or emoji will format the message to send `#guild-ingame-chat` instead of `<#833696107228823612>` for example
-   Colored messages log in console
-   /g slow will also set a slow mode on the set Discord channel
-   The bot will always try and stay in limbo

## Installing

### Requirements:

-   Git
-   Note.js >= `16`
-   Minecraft Account
-   Discord Bot (Token)

### Setup:

1. Clone this repository using `git clone https://github.com/Altpapier/hypixel-discord-guild-bridge.git`
2. Install all dependencies using NPM by going into the `hypixel-discord-guild-bridge` folder and executing the `npm install` command
3. Rename the `example_config.json` file to `config.json` (Example: `cp example_json.json config.json)`
4. Modify the `config.json` file and set up all the available configurations
5. Start the bot using the `node .` command

## Configurations

1. **Minecraft**

```
"minecraft": {
	"username": "",
	"password": "",
	"microsoftAuth": true,
	"doNotUsePassword": false,
	"ingameName": ""
}
```

For this you will first need to enter your Minecraft login data into the `username` (email) and `password` fields. If you are using a Mojang account, make sure to set `microsoftAuth` to `false`. After this enter your Minecraft accounts in game name into the `ingameName` field. After starting the bot once, there might be an issue with the Microsoft authentication. If this is the case, try to set `doNotUsePassword` to `false`.

2. **Keys**

```
"keys": {
	"discordBotToken": "",
	"hypixelApiKey": "",
	"imgurClientId": ""
}
```

_Discord Bot Token_:
For this bot to work you will need to have a Discord bot and a Hypixel API key. If you do not have a Discord bot token to use for this, you will need to create a new one. To create a Discord bot and get the bot token, go to [https://discord.dev/](https://discord.dev/) and click on `Applications`. Then click on `New Application` and give the application a name and then press `Create`. After that click on `Bot` on the left side of the screen. To create the bot, you will now need to click on `Add Bot` and then `Yes, do it!`. To obtain the bot token click on `Reset Token` and `Yes, do it!` and enter your 2FA code if needed. You can now press `Copy` and paste the token into the `discordBotToken` field of the configuration file. **IMPORTANT**: This is also required if you already have a Discord bot: Scroll down a bit and enable the `Server Members Intent` as well as the `Message Content Intent`. Make sure to Make sure to also invite the bot to your server. This can be done by clicking on `OAuth2` and then on `URL Generator`. From the scopes you will need to choose the `bot` and `applications.commands` scope. After you did that you can choose the bots permissions. If you are lazy you can just choose the `Administrator` option. Finally, you can click `Copy` on the `Generated URL` and choose the server the bot should be in.

_Hypixel API Key_:
If you currently do not know your Hypixel API key, you will need to generate yourself a new one. To do so, join Hypixel and execute the `/api new` command. This will now show your newly generated API key that you can paste into the `hypixelApiKey` field of the configuration file.

_Imgur Client ID_:
**NOTE**: This is only required if you want to use the `!render` in game command! If you do not intend to use this command, you can leave this field empty.
To get an Imgur client ID you will first need to head over to [https://api.imgur.com/oauth2/addclient/](https://api.imgur.com/oauth2/addclient/). If you do not currently own a Imgur account, make sure to create one by clicking on `need an account? `. Else you can just sign in. Fill in all the information on that page and create the new Imgur client. After everything is done you will get a `Client ID` and `Client Secret`. If you want to use the Imgur API later as well, you can save that one as well, but you will only need the `Client ID` for this here to work. Now copy your `Client ID` and paste it into the `imgurClientId` field of the configuration file. More information on the Imgur API can be found at [https://apidocs.imgur.com/](https://apidocs.imgur.com/).

3.  **Channels**

```
"channels": {
	"guildIngameChat": "",
	"officerIngameChat": "",
	"ingameChatLog": "",
	"log": "",
	"logOptions": {
		"hypixelLogin": false,
		"hypixelDisconnect": true,
		"hypixelKicked": true,
		"ingameChatLogFilter": ["EASTER EGG NEARBY!", "BUSY", "AWAY", "APPEARING OFFLINE"]
	}
}
```

First you will need to get the IDs for all the channels. To obtain a certain channel ID right click the channel you want to get the ID from and then click on `Copy ID`. If this option is not available to you, you will need to enable the `Developer Mode`. To enable the `Developer Mode` in Discord go to your `User Settings` located right next to the Deafen button and then click on `Advanced`. Now you just need to enable `Developer Mode` and you will be able to obtain the channel IDs.
The bot uses four different channels.
The `Guild Ingame Chat (guildIngameChat)` which allows players to get and send messages between Minecraft and Discord. Setting this channel is _required_.
The `Guild Officer Ingame Chat (officerIngameChat)` behaves just like the Guild Ingame Chat just that this is is for the Officer Chat. Make sure to set permissions who will be able to read and send messages in there. Setting this channel is _optional_.
The `Ingame Chat Log (ingameChatLog)` will display the text the bot sees. Players will be able to have full control over the bot by executing commands or sending messages from Discord to Minecraft, so please make sure to set these channels permissions properly! Setting this channel is _optional_ but _recommended_.
The `Log (log)` channel will send messages based on the configurations `logOptions`. `hypixelLogin` will send a message when the player has joined Hypixel, `hypixelDisconnect` will send a message when the bot disconnected and `hypixelKicked` will send a message in that channel if the bot was either kicked from Hypixel or banned. If on bot startup you see a lot of spammy repeating messages, make sure to add those into the `ingameChatLogFilter` array. Setting this channel is _optional_.

4 . **Discord Server**

```
"discordServer": ""
```

Before starting the bot make sure to copy the Discord server ID where the bot is supposed to be by right clicking the Server icon and clicking on `Copy ID`.

5. **Ingame Chat Events**

```
"ingameChatEvents": {
	"guildJoin": true,
	"guildLeave": true,
	"guildKick": true,
	"guildMute": true,
	"guildUnmute": true,
	"guildPromote": true,
	"guildDemote": true,
	"guildDescription": true,
	"guildAddedGame": true,
	"guildVisibilitySetting": true,
	"guildLevelUp": true,
	"guildChatThrottle": true,
	"guildQuest": true,
	"guildRankGift": true,
	"guildPlayerLeave": false,
	"guildPlayerJoin": false
}
```

Here you can set which events should be broadcasted into the `Guild Ingame Chat` and which not. If you wish to not want one of those events to be displayed in that channel set the value to `false`. If you do want to have those set the value to `true`.
|Key|Function|
|--|--|
|`guildJoin`|Shows when a new guild member joins the guild|
|`guildLeave`|Shows when a guild member leaves the guild|
|`guildKick`|Shows when a guild member gets kicked out of the guild|
|`guildMute`|Shows when a guild member gets muted by a guild staff member|
|`guildUnmute`|Shows when a guild member gets unmuted by a guild staff member|
|`guildPromote`|Shows when a guild member gets promoted to a higher guild rank|
|`guildDemote`|Shows when a guild member gets demoted to a lower guild rank|
|`guildDescription`|Shows when a guild staff member changes the guild description|
|`guildAddedGame`|Shows when a guild staff member changes the guild prefered games|
|`guildVisibilitySetting`|Shows when a guild staff member changes the guild visibility setting|
|`guildLevelUp`|Shows when the guild levels up|
|`guildChatThrottle`|Shows when the guild chat slow mode was activated/deactivated|
|`guildQuest`|Shows when the guild completed a guild quest|
|`guildRankGift`|Shows when a guild member gifts another guild member a rank|
|`guildPlayerLeave`|Shows when a guild member leaves the Hypixel server|
|`guildPlayerJoin`|Shows when a guild member joins the Hypixel server|

6. **Options**

```
"options": {
	"ingameChatConsoleLog": true,
	"discordUseSlowCommand": true,
	"discordDefaultSlow": 0,
	"messageSentConfirmation": {
		"checkmarkReactions": true,
        "failedReactions": true
	}
}
```

`ingameChatConsoleLog` will show the Minecraft chat in the terminal. If you wish for it to not show in the console, make sure to set that value to `false`.
`discordUseSlowCommand` will also set a slow mode on the `Guild Ingame Chat` if this was enabled or disabled by a guild staff member using `/g slow`. By default, the slow mode on the channel is set to 0 seconds. You can edit that by changing the `discordDefaultSlow` value to any number (in seconds).
The message sent confirmation will react on messages sent by Discord members in the `Guild Ingame Chat`. If the message a member sent was sent successfully the bot will react with ✅. If the message was not sent successfully because of `You cannot say the same message twice!` or other reasons the bot will react with ⛔. To disable either both or one of those set the value of `checkmarkReactions` and/or `failedReactions` to `false`.

7. **Ingame Commands**

```
"ingameCommands": {
	"paste": true,
	"render": true,
	"skills": true,
	"weight": true,
	"networth": true
}
```

To disable one of those commands set the value to `false`

8. **GEXP Managment**

```
"gexpManagment": {
	"weeklyGEXPRequirement": 50000
}
```

Set the weekly gexp requirement for the `/gexp` slash command on Discord. This will show all guild members that are above that limit and all guild members that are under it. If you provide a player name (eg. `/gexp Altpapier`) it will show the last weeks guild experience of that player and some more information.
If you wish to not set a gexp requirment set the value to `0`.

9. **Slash Commands Set**

```
"slashCommandsSet": false
```

If the slash commands are not currently set in the selected Discord server, set this value to `false` and it will set the slash commands for that server again on the next restart.

10. **API**

```
"api": {
	"enabled": false,
	"port": 3000,
	"keys": {},
	"routes": {
		"chat": true,
		"mute": false,
		"unmute": false,
		"kick": false,
		"invite": false,
		"setrank": false
	}
}
```

If you wish to execute some commands or use the chat by making `POST` requests, you will need to enable this feature by setting `enabled` to `true`. You can change the default port of `3000` to whatever port you want. In the `keys` object you can add API keys. Add API keys using this format: `"KEY": [ROUTES]`. For the `KEY` you can set the key and for `ROUTES` you pass through the routes that will be able to be used with that key.
Example (_DO NOT USE_):

```
"keys": {
	"test_key": ["chat", "invite"],
	"test_key_2": ["mute", "unmute", "kick", "setrank"]
}
```

You can also set what routes should be available by either setting the value to `false` to not be available or `true`.
|Route|Feature|Example Request Data|
|--|--|-- |
|`chat`|Send a message like you would in the Discord channel| `{ "author": "Altpapier", "message": "test" }` |
|`invite`| Send an invite to a player| `{ "player": "Altpapier" }`
|`kick`|Kick a guild member from the guild|`{ "player": "Altpapier", "reason": "test" }`
|`mute`|Mute a guild member from the guild chat| `{ "player": "Altpapier", "time": "1d" }`
|`unmute`|Unmute a muted guild member|`{ "player": "Altpapier }`
|`setrank`|Set a guild member's guild rank| `{ "player": "Altpapier", "rank": "Staff" }`

11. **Guild Requirement**

```
"guildRequirement": {
	"enabled": false,
	"autoAccept": false,
	"requirements": {
		"senitherWeight": 0,
		"lilyWeight": 0,
		"hypixelLevel": 0,
		"skillAverage": 0,
		"slayer": {
			"revenant": 0,
			"tarantula": 0,
			"wolf": 0,
			"enderman": 0,
			"blaze": 0
		}
	}
}
```

To enable this feature, set `enabled` to `true`. If you wish for players that request to join the guild and meet the requirements to automatically be accepted into the guild, set `autoAccept` to `true`. If `autoAccept` is set to `false` this will only send a message with the players requirements into the officer chat. If you wish for players to be accepted even if they only meet a couple of requirements, you can add the `minRequired` key to the `guildRequirement` object with the minimum required requirements.
If you wish to not include one of the requirement options, please just keep the value at `0`. Else you can set the values of the requirements you want your guild to have, to whatever you want.  
To check other player requirements, you can use the `/requirements` command in a Discord channel.

12. **Guild Welcome**

```
"guildWelcome": {
	"enabled": true,
	"message": "Welcome to the guild {USERNAME}!"
}
```

To enable this feature, set `enabled` to `true`. This will send a welcome message into the guild chat to welcome a user! This can for example also be information about the weekly guild experience requirements. The bot will automatically replace `{USERNAME}` with the newly joined guild member.

13. **Frag Bot** (**Use at your own risk!**)

```
"fragBot": {
	"enabled": true,
	"addedToQueueMessage": "You have been added to the queue. Estimated queue time: {WAIT_TIME} seconds",
	"partyWelcomeMessage": "Hello! You can join a dungeon now. I will automatically leave after 5 seconds.",
	"whitelistGuildMembers": true,
	"whitelistEnabled": true,
	"whitelist": []
}
```

To enable this feature, set `enabled` to `true`. In `addedToQueueMessage`, the bot will automatically replace `{WAIT_TIME}` with the estimated queue time. If you wish for anyone on Hypixel to be able to use this frag bot (_not recommended_) you can disable the whitelist by setting `whitelistEnabled` to `false`. By default, guild members will automatically be whitelisted to the frag bot. If you wish to disable this, set `whitelistGuildMembers` to `false`. You can add your own players to the whitelist as well that are for example not in the guild by adding items into the `whitelist` array.
_Example_:

```
"whitelist": ["Altpapier", "MattTheCuber"]
```
