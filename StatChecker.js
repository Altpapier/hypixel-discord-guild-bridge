//const MinecraftCommand = require('../../contracts/MinecraftCommand')
const fetch = require('node-fetch');
const fs = require('fs');
const { getNetworth } = require('skyhelper-networth');
const nbt = require('prismarine-nbt')

//stats
const config = require('./config.json')
const apiKey = config.keys.hypixelApiKey

//cache
const refreshTime = 1000 * 5 * 60; 3
let cache = {};
let remainingRequests = 120
let timeTillReset = 60

//pets
let knownPets = [];
let knownSkins = [];

//consts
const constants = require("./constants");
let getTaliData = async () => {
    let raw = await fetch('https://api.tenios.dev/talismans');
    let obj = await raw.json();
    return obj;
}
var taliData;
getTaliData().then(data => taliData = data);
const bestiary = constants.bestiary;
const bestiaryTiers = constants.bestiary_brackets;


/*class StatChecker{

    constructor(minecraft) {
        super(minecraft);
        this.minecraft = minecraft;
    }

    onCommand(username, message) {
        let parts = message.toLowerCase().split(' ')
        if (parts.length < 1)
            return;
        if (['!s', '!stats'].includes(parts[0]))
            parts.shift()
        if (parts.length < 1)
            return;

        let stat = parts[0];
        if (stat.startsWith('!'))
            stat = stat.substring(1)
        if (stat.startsWith('lb') || stat.startsWith('leaderboard')) {
            getLeaderboard(message).then(reply => {
                if (reply != null) {
                    this.send(`/gc ${reply}`);
                    this.minecraft.getBridge().client.channels.fetch(config.discord.channel).then(async channel => channel.send(reply));
                } else {
                    this.minecraft.broadcastMessage({
                        username: username,
                        message: message,
                    })
                }
            }, reason => console.error(reason)).catch(e => console.log(e));
            return;
        }
        let name = parts.length > 1 ? parts[1] : username;
        let full = parts.length > 1 ? parts.slice(1).join(' ') : '';
        getInfoText(stat, name, full).then(reply => {
            if (reply != null) {
                this.send(`/gc Stats: ${reply}`);
                this.minecraft.getBridge().client.channels.fetch(config.discord.channel).then(async channel => channel.send(reply));
            }
            else this.minecraft.broadcastMessage({
                username: username,
                message: message,
            })
        }, reason => console.error(reason)).catch(e => console.log(e));
    }
}*/

async function getInfoText(statistic, name_obj, full) {
    let name = name_obj.toLowerCase();
    //useless stuff for fun
    if (name == "greg") name = "DragonBoii";

    //prepare stat
    const stat = statistic.replace(/-/g, "").toLowerCase();

    //runs and pb are special
    if (stat.startsWith("pb")) {
        let player = await getPlayerHypixel(name);
        if (player == null) return;
        let floor = 7;
        if (/(pb\d)|(pbf\d)|(pbm\d)/.test(stat))
            floor = Math.min(7, parseInt(stat.substring(stat.length - 1)));
        else if (stat == "pbentrance" || stat == "pbe") floor = 0;
        let score = "fastest_time_s";
        if (floor > 4) score = "fastest_time_s_plus";
        let mode = "master_catacombs";
        if (stat.includes("m")) {
            mode = "master_catacombs";
            floor = Math.min(7, floor);
            floor = Math.max(1, floor);
            if (floor < 5) score = "fastest_time_s";
        }
        if (/(pb\d)|(pbf\d)|(pbm\d)/.test(stat) && !stat.includes('m'))
            mode = "catacombs";
        try {
            if (
                score in player.dungeons.dungeon_types[mode] &&
                floor in player.dungeons.dungeon_types[mode][score]
            ) {
                return `Fastest ${mode == "catacombs" ? "f" : "m"}${floor} S${(floor > 4 && mode == "catacombs") || floor > 5 ? "+" : ""
                    } for ${player.username}: ${dungeonTime(
                        player.dungeons.dungeon_types[mode][score][floor]
                    )}`;
            } else if (
                "tier_completions" in player.dungeons.dungeon_types[mode] &&
                floor in player.dungeons.dungeon_types[mode].tier_completions
            ) {
                return `${player.username} never got S${floor > 4 ? "+" : ""} on ${mode == "catacombs" ? "f" : "m"
                    }${floor}. Highest score: ${player.dungeons.dungeon_types[mode].best_score[floor]
                    }, Best time: ${dungeonTime(
                        player.dungeons.dungeon_types[mode].fastest_time[floor]
                    )}`;
            } else
                return (
                    `${player.username} did not complete ${mode == "catacombs" ? "f" : "m"
                    }${floor}` +
                    (mode == "catacombs"
                        ? ` but tried ${player.dungeons.dungeon_types[mode].times_played[floor]} times`
                        : "")
                );
        } catch (e) {
            console.log(e.stack);
        }
        return `${player.username} never played ${mode == "catacombs" ? "f" : "m"
            }${floor} `;
    } else if (stat.startsWith("runs")) {
        let player = await getPlayerHypixel(name);
        if (player == null) return;
        let floor = 7;
        if (/(runs\d)|(runsf\d)|(runsm\d)/.test(stat)) {
            floor = Math.min(7, parseInt(stat.substring(stat.length - 1)));
        } else if (stat == "runsentrance" || stat == "runse") {
            floor = 0;
        }
        normal_completions = 0;
        master_completions = 0;
        runs_started = 0;
        try {
            if (floor in player.dungeons.dungeon_types.catacombs.times_played)
                runs_started =
                    player.dungeons.dungeon_types.catacombs.times_played[floor];
            if (floor in player.dungeons.dungeon_types.catacombs.tier_completions)
                normal_completions =
                    player.dungeons.dungeon_types.catacombs.tier_completions[floor];
            if (
                floor in player.dungeons.dungeon_types.master_catacombs.tier_completions
            )
                master_completions =
                    player.dungeons.dungeon_types.master_catacombs.tier_completions[
                    floor
                    ];
        } catch (e) { }
        return `${player.username} completed ${normal_completions + master_completions
            } / ${runs_started} floor ${floor} runs (${normal_completions} normal, ${master_completions} master)`;
    } else if (stat.startsWith('team')) {
        return new Promise(function (resolve, reject) {
            getPlayerHypixel(name)
                .then(async (player) => {
                    if (!("dungeons" in player))
                        resolve(`${player.username} never played dungeons`);
                    let floor = -1;
                    let master = false;
                    let all = true;
                    if (/(team\d)|(teamf\d)|(teamm\d)/.test(stat)) {
                        floor = Math.min(7, parseInt(stat.substring(stat.length - 1)));
                        all = false;
                    }
                    if (stat.includes('mm')) {
                        master = true;
                        all = false;
                        if (floor === 0)
                            floor = 1
                    } else if (stat.includes('f')) {
                        master = false;
                        all = false;
                    }
                    let teamObj = {};
                    for (let mode in player.dungeons.dungeon_types) {
                        if (!all && mode === 'catacombs' && master) continue;
                        if (!all && mode === 'master_catacombs' && !master) continue;
                        for (let i in player.dungeons.dungeon_types[mode].best_runs) {
                            if (floor > -1 && i != floor) continue;
                            for (let j in player.dungeons.dungeon_types[mode].best_runs[
                                i]) {
                                for (let k in player.dungeons.dungeon_types[mode].best_runs[
                                    i][j].teammates) {
                                    let teammateUuid =
                                        player.dungeons.dungeon_types[mode].best_runs[i][j]
                                            .teammates[k];
                                    if (!(teammateUuid in teamObj)) {
                                        teamObj[teammateUuid] = 1;
                                    } else {
                                        teamObj[teammateUuid] = teamObj[teammateUuid] + 1;
                                    }
                                }
                            }
                        }
                    }
                    //sort object according to occurences
                    let sortedKeys = Object.keys(teamObj).sort(
                        (a, b) => teamObj[b] - teamObj[a]
                    );
                    if (sortedKeys.length < 4)
                        resolve(`${player.username} never played ${all ? 'dungeons' : !master ? 'f' + floor : 'm' + floor}`);
                    resolve(
                        `${player.username
                        } achieved their best ${all ? ' overall' : (master ? 'm' : 'f') + floor} results with ${await getUsernameFromUUID(
                            sortedKeys[0]
                        )}, ${await getUsernameFromUUID(
                            sortedKeys[1]
                        )}, ${await getUsernameFromUUID(
                            sortedKeys[2]
                        )} and ${await getUsernameFromUUID(sortedKeys[3])} `
                    );
                })
                .catch((e) => {
                    console.log(e)
                    reject(`Could not find ${name} `);
                });
        });
    } else if (
        ["lwe", "lappywe", "lilywe"].includes(stat) ||
        (stat.endsWith("weight") && stat !== "weight")
    ) {
        weight_obj = await getLilyWeight(name);
        if (weight_obj == null) return;
        return (
            `${weight_obj.username} has ${shortenDot(
                weight_obj.data.total
            )} lily weight (${shortenDot(
                weight_obj.data.skill.base + weight_obj.data.skill.overflow
            )} skills, ` +
            `${shortenDot(weight_obj.data.slayer)} slayers, ${shortenDot(
                weight_obj.data.catacombs.experience
            )} cata lvl, ` +
            `${shortenDot(
                weight_obj.data.catacombs.completion.base +
                weight_obj.data.catacombs.completion.master
            )} floor completions)`
        );
    } else {
        switch (stat) {
            case "discord":
                return new Promise(function (resolve, reject) {
                    getPlayerStatsHypixel(name)
                        .then((player) => {
                            if ("DISCORD" in player.socialMedia.links)
                                resolve(
                                    `Discord name for ${player.playername}: ${player.socialMedia.links.DISCORD}`
                                );
                            else
                                resolve(
                                    `${player.playername} did not connect their discord account`
                                );
                        })
                        .catch(() =>
                            reject(`${name} did not connect their discord account`)
                        );
                });
            case "gexp":
                return new Promise(function (resolve, reject) {
                    getGuildData(name)
                        .then((data) => {
                            let gexp = 0;
                            for (let i in data.guild.members) {
                                let member = data.guild.members[i];
                                if (member.uuid == data.uuid) {
                                    for (let j in member.expHistory) {
                                        gexp += member.expHistory[j];
                                    }
                                    break;
                                }
                            }
                            resolve(
                                `${data.username} has a total of ${dot(
                                    gexp
                                )} gexp in the last 7 days`
                            );
                        })
                        .catch((e) => {
                            reject(`${name} is not in a guild`);
                        });
                });
            case "activity":
                return new Promise(function (resolve, reject) {
                    getPlayerStatsHypixel(name)
                        .then((player) => {
                            if (player.lastLogin > player.lastLogout)
                                resolve(`${player.playername} is currently online`);
                            lastUpdate = parseInt((Date.now() - player.lastLogout) / 1000);
                            if (isNaN(lastUpdate))
                                resolve(
                                    `No activity information found for ${player.playername}`
                                );
                            if (lastUpdate < 300)
                                resolve(
                                    `${player.playername} was online in the last 5 minutes`
                                );
                            if (lastUpdate < 3600)
                                resolve(
                                    `${player.playername} was online ${parseInt(
                                        lastUpdate / 60
                                    )} minutes ago`
                                );
                            if (lastUpdate < 3600 * 24)
                                resolve(
                                    `${player.playername} was online ${parseInt(
                                        lastUpdate / 60 / 60
                                    )} hours ago`
                                );
                            resolve(
                                `${player.playername} was online ${getTimeString(
                                    Date.now() - player.lastLogout
                                )}ago`
                            );
                        })
                        .catch(() => reject(`${name} does not exist`));
                });
            case "ap":
                return new Promise(function (resolve, reject) {
                    getPlayerStatsHypixel(name)
                        .then((player) =>
                            resolve(
                                `${player.playername} collected ${dot(
                                    player.achievementPoints
                                )} achievement points`
                            )
                        )
                        .catch(() =>
                            reject(`${name} did not collect any achievement points`)
                        );
                });
            case "achievements":
                return new Promise(function (resolve, reject) {
                    getPlayerStatsHypixel(name)
                        .then(async (player) => {
                            achievements = await getJsonFromUrl(
                                "https://api.hypixel.net/resources/achievements"
                            );
                            let achievementsOnce = [];
                            let playerAchievementsOnce = [];
                            for (let i in achievements.achievements.skyblock.one_time) {
                                achievementsOnce.push(i);
                            }
                            for (let i in player.achievementsOneTime) {
                                let achievement_name = player.achievementsOneTime[i];
                                if (achievement_name.startsWith("skyblock_"))
                                    playerAchievementsOnce.push(achievement_name);
                            }
                            let playerTieredAchievements = 0;
                            let totalTieredAchievements = 0;
                            for (let i in achievements.achievements.skyblock.tiered) {
                                let tieredAchievement =
                                    achievements.achievements.skyblock.tiered[i];
                                let playerValue =
                                    player.achievements[`skyblock_${i.toLowerCase()}`];
                                totalTieredAchievements += Object.keys(
                                    tieredAchievement.tiers
                                ).length;
                                for (let tier in tieredAchievement.tiers) {
                                    if (playerValue >= tieredAchievement.tiers[tier].amount)
                                        playerTieredAchievements += 1;
                                }
                            }
                            resolve(
                                `${player.playername} completed ${playerTieredAchievements + playerAchievementsOnce.length
                                }/${totalTieredAchievements + achievementsOnce.length
                                } skyblock achievement (${playerAchievementsOnce.length}/${achievementsOnce.length
                                } one time, ${playerTieredAchievements} /${totalTieredAchievements} tiered)`
                            );
                        })
                        .catch(() => reject(`${name} did not unlock any achievements`));
                });
            case "guild":
                return new Promise(function (resolve, reject) {
                    getGuildData(name)
                        .then((data) => {
                            if ("guild" in data && data.guild != null)
                                resolve(`${data.username} is in the guild ${data.guild.name}`);
                            else resolve(`${data.username} is not in a guild`);
                        })
                        .catch((e) => {
                            reject(`${name} is not in a guild`);
                        });
                });
            case "membercount":
            case "mc":
                return new Promise(function (resolve, reject) {
                    getGuildByGuildName(full)
                        .then((data) => {
                            resolve(
                                `There are ${data.guild.members.length} members in the guild ${data.guild.name}`
                            );
                        })
                        .catch((e) => {
                            reject(`Can not find guild ${full}`);
                        });
                });
            //skyblock API commands
            case "petxp":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let petxp = 0;
                            for (let i in player.pets) {
                                let pet = player.pets[i];
                                petxp = petxp + pet.exp;
                            }
                            resolve(`${player.username} has ${dot(petxp)} total pet xp`);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "candy":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let petcandy = 0;
                            for (let i in player.pets) {
                                let pet = player.pets[i];
                                petcandy = petcandy + pet.candyUsed;
                            }
                            resolve(
                                `${player.username} used a total of ${dot(
                                    petcandy
                                )} candy on their pets`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "pets":
            case "petscore":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then(async (profile) => {
                            let pets = {};
                            let getRarityValue = (rarity) => {
                                switch (rarity) {
                                    case 'MYTHIC': return 6;
                                    case 'LEGENDARY': return 5;
                                    case 'EPIC': return 4;
                                    case 'RARE': return 3;
                                    case 'UNCOMMON': return 2;
                                    case 'COMMON': return 1;
                                    default:
                                        return 0;
                                }
                            }
                            let getMaxXpRequired = (rarity) => {
                                switch (rarity) {
                                    case 'EPIC': return 18_608_500;
                                    case 'RARE': return 12_626_665;
                                    case 'UNCOMMON': return 8_644_220;
                                    case 'COMMON': return 5_624_785;
                                    default:
                                        return 25_353_230;
                                }
                            }
                            profile?.pets?.forEach(pet => {
                                let type = pet.type;
                                let rarity = pet.tier;
                                if (type === 'JERRY' && pet.heldItem === 'PET_ITEM_TOY_JERRY') rarity = 'MYTHIC';
                                if (type === 'BAT' && pet.heldItem === 'PET_ITEM_VAMPIRE_FANG') rarity = 'MYTHIC';
                                // comment this in once wisp pet stacking is fixed
                                //if (type.includes('WISP')) type = 'WISP';
                                let value = getRarityValue(rarity);
                                if (pet.exp >= getMaxXpRequired(rarity)) value++;
                                if (value > (pets?.[type] || 0))
                                    pets[type] = value;
                            })
                            let petscore = Object.values(pets).reduce((prev, val) => prev + val, 0);
                            resolve(`${profile.username} has a petscore of ${dot(petscore)}.`);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "secretratio":
            case "ratio":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then(async (player) => {
                            let p2 = await getPlayerStatsHypixel(name);
                            resolve(
                                `On average, ${player.username} found ${shortenDot(
                                    p2.achievements.skyblock_treasure_hunter /
                                    findCompletedRuns(player.dungeons)
                                )} (${dot(p2.achievements.skyblock_treasure_hunter)}/${dot(
                                    findCompletedRuns(player.dungeons)
                                )}) secrets per completed run / ${shortenDot(
                                    p2.achievements.skyblock_treasure_hunter /
                                    findTotalRuns(player.dungeons)
                                )} overall (${dot(
                                    p2.achievements.skyblock_treasure_hunter
                                )}/${dot(findTotalRuns(player.dungeons))})`
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "rock":
            case "ores":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} mined ${dot(
                                    player.stats.pet_milestone_ores_mined
                                )} ores`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "seacreatures":
            case "dolphin":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} killed ${dot(
                                    player.stats.pet_milestone_sea_creatures_killed
                                )} sea creatures`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "fees":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} spent ${dot(
                                    player.stats.auctions_fees
                                )} coins on auction fees`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "deaths":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} died ${dot(
                                    player.stats.deaths
                                )} times in total`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "kills":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} killed a total of ${dot(
                                    player.stats.kills
                                )} creatures`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "mytho":
            case "mythokills":
            case "diana":
            case "dianakills":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} killed ${dot(
                                    player.stats.mythos_kills
                                )} mythological creatures`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "inquis":
            case "inquisitors":
            case "inquisitorkills":
            case "inquiskills":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} killed ${dot(
                                    player.stats.kills_minos_inquisitor
                                )} minos inquisitors`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "champs":
            case "champions":
            case "champkills":
            case "championkills":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} killed ${dot(
                                    player.stats.kills_minos_champion
                                )} minos champions`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "mythoskd":
            case "mythosk/d":
            case "dianakd":
            case "dianak/d":
            case "k/d":
            case "kd":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let inquisDeaths =
                                "deaths_minos_inquisitor" in player.stats
                                    ? player.stats.deaths_minos_inquisitor
                                    : 0;
                            let champDeaths =
                                "deaths_minos_champion" in player.stats
                                    ? player.stats.deaths_minos_champion
                                    : 0;
                            let gaiaDeaths =
                                "deaths_gaia_construct" in player.stats
                                    ? player.stats.deaths_gaia_construct
                                    : 0;
                            let hunterDeaths =
                                "deaths_minos_hunter" in player.stats
                                    ? player.stats.deaths_minos_hunter
                                    : 0;
                            let catDeaths =
                                "deaths_siamese_lynx" in player.stats
                                    ? player.stats.deaths_siamese_lynx
                                    : 0;
                            let minotaurDeaths =
                                "deaths_minotaur" in player.stats
                                    ? player.stats.deaths_minotaur
                                    : 0;
                            let dianaDeaths =
                                inquisDeaths +
                                champDeaths +
                                gaiaDeaths +
                                catDeaths +
                                hunterDeaths +
                                minotaurDeaths;

                            let inquisKills =
                                "kills_minos_inquisitor" in player.stats
                                    ? player.stats.kills_minos_inquisitor
                                    : 0;
                            let champKills =
                                "kills_minos_champion" in player.stats
                                    ? player.stats.kills_minos_champion
                                    : 0;
                            let gaiaKills =
                                "kills_gaia_construct" in player.stats
                                    ? player.stats.kills_gaia_construct
                                    : 0;
                            let hunterKills =
                                "kills_minos_hunter" in player.stats
                                    ? player.stats.kills_minos_hunter
                                    : 0;
                            let catKills =
                                "kills_siamese_lynx" in player.stats
                                    ? player.stats.kills_siamese_lynx
                                    : 0;
                            let minotaurKills =
                                "kills_minotaur" in player.stats
                                    ? player.stats.kills_minotaur
                                    : 0;
                            let dianaKills =
                                "mythos_kills" in player.stats ? player.stats.mythos_kills : 0;
                            if (dianaKills == 0 && dianaDeaths == 0) {
                                resolve(`${player.username} never played a mythological event`);
                            } else if (dianaKills == 0) {
                                resolve(
                                    `${player.username} did not kill any mythological creatures but died ${dianaDeaths} times trying`
                                );
                            } else {
                                let result = `${player.username} managed to kill ${shortenDot(
                                    (100 * dianaKills) / (dianaDeaths + dianaKills)
                                )}% of all mythological creatures (`;
                                if (inquisDeaths != 0 || inquisKills != 0)
                                    result += `${parseInt(
                                        (100 * inquisKills) / (inquisKills + inquisDeaths)
                                    )}% inq, `;
                                if (champDeaths != 0 || champKills != 0)
                                    result += `${parseInt(
                                        (100 * champKills) / (champKills + champDeaths)
                                    )}% champ, `;
                                if (gaiaDeaths != 0 || gaiaKills != 0)
                                    result += `${parseInt(
                                        (100 * gaiaKills) / (gaiaKills + gaiaDeaths)
                                    )}% gaia, `;
                                if (minotaurDeaths != 0 || minotaurKills != 0)
                                    result += `${parseInt(
                                        (100 * minotaurKills) / (minotaurKills + minotaurDeaths)
                                    )}% minotaur, `;
                                if (catDeaths != 0 || catKills != 0)
                                    result += `${parseInt(
                                        (100 * catKills) / (catKills + catDeaths)
                                    )}% cats, `;
                                if (hunterDeaths != 0 || hunterKills != 0)
                                    result += `${parseInt(
                                        (100 * hunterKills) / (hunterKills + hunterDeaths)
                                    )}% hunter`;
                                console.log(hunterDeaths);
                                result += ")";
                                resolve(result);
                            }
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "catacombs":
            case "catacombsxp":
            case "cataxp":
            case "cata":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is cata ${parseFloat(findCataLvl(player?.dungeons?.dungeon_types?.catacombs?.experience)
                                ).toFixed(2)} with ${dot(player?.dungeons?.dungeon_types?.catacombs?.experience)} cata xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "tankxp":
            case "tank":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is tank ${parseFloat(findCataLvl(
                                    player?.dungeons?.player_classes?.tank?.experience)
                                ).toFixed(2)} with ${dot(
                                    parseInt(player?.dungeons?.player_classes?.tank?.experience)
                                )} tank xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "healerxp":
            case "healer":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is healer ${parseFloat(findCataLvl(
                                    player?.dungeons?.player_classes?.healer?.experience)
                                ).toFixed(2)} with ${dot(
                                    parseInt(player?.dungeons?.player_classes?.healer?.experience)
                                )} healer xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "berserkerxp":
            case "berserker":
            case "berserk":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is berserk ${parseFloat(findCataLvl(
                                    player?.dungeons?.player_classes?.berserk?.experience)
                                ).toFixed(2)} with ${dot(
                                    parseInt(player?.dungeons?.player_classes?.berserk?.experience)
                                )} berserk xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "magexp":
            case "mage":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is mage ${parseFloat(findCataLvl(
                                    player?.dungeons?.player_classes?.mage?.experience)
                                ).toFixed(2)} with ${dot(
                                    parseInt(player?.dungeons?.player_classes?.mage?.experience)
                                )} mage xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "archerxp":
            case "archer":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is archer ${parseFloat(findCataLvl(
                                    player?.dungeons?.player_classes?.archer?.experience)
                                ).toFixed(2)} with ${dot(
                                    parseInt(player?.dungeons?.player_classes?.archer?.experience)
                                )} archer xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "secrets":
                return new Promise(function (resolve, reject) {
                    getPlayerStatsHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.playername} found ${dot(
                                    parseInt(player.achievements.skyblock_treasure_hunter)
                                )} secrets`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "catawe":
            case "catacombsweight":
            case "dungwe":
            case "dungeonwe":
            case "dungeonweight":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let allWeight = getDungeonWeight(player);
                            let weight = allWeight.reduce((prev, [we, ov]) => prev + we, 0);
                            let ov = allWeight.reduce((prev, [we, ov]) => prev + ov, 0);
                            resolve(
                                `${player.username} has ${shortenDot(weight + ov)} dungeon weight (${shortenDot(weight)} we / ${shortenDot(ov)} ov)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "coins":
            case "bank":
            case "purse":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixelFullProfile(name).then((profile) => {
                        let purse = profile?.members[profile.uuid]?.coin_purse ?? 0;
                        let bank = profile?.banking?.balance;
                        resolve(`${profile.username} has ${space(purse + (bank ?? 0))
                            } coins ` + (bank ? `(${space(parseInt(purse))} purse / ${space(parseInt(bank))} bank)` : `in their purse`)
                        );
                    });
                });
            case "souls":
            case "fairysouls":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} found ${dot(
                                    parseInt(player?.fairy_souls_collected)
                                )
                                } fairy souls`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "slayer":
            case "slayers":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} has slayer lvls ${getSlayerLvl(
                                    player.slayer_bosses.zombie.xp
                                )
                                }${getSlayerLvl(player.slayer_bosses.spider.xp)}` +
                                `${getSlayerLvl(player.slayer_bosses.wolf.xp)} ${"enderman" in player.slayer_bosses
                                    ? getSlayerLvl(player.slayer_bosses.enderman.xp)
                                    : 0
                                }${"blaze" in player.slayer_bosses
                                    ? getSlayerLvl(player.slayer_bosses.blaze.xp)
                                    : 0
                                } and ${dot(
                                    player.slayer_bosses.zombie.xp +
                                    player.slayer_bosses.spider.xp +
                                    player.slayer_bosses.wolf.xp +
                                    ("enderman" in player.slayer_bosses &&
                                        "xp" in player.slayer_bosses.enderman
                                        ? player.slayer_bosses.enderman.xp
                                        : 0) +
                                    ("blaze" in player.slayer_bosses &&
                                        "xp" in player.slayer_bosses.blaze
                                        ? player.slayer_bosses.blaze.xp
                                        : 0)
                                )
                                } total slayer xp`
                            );
                        })
                        .catch((e) => {
                            console.log(e), reject(`Could not find ${name} `);
                        });
                });
            case "rev":
            case "revs":
            case "zombie":
            case "revxp":
            case "zombiexp":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is zombie slayer ${getSlayerLvl(
                                    player.slayer_bosses.zombie.xp
                                )} with ${dot(player.slayer_bosses.zombie.xp)} xp`
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name} `);
                        });
                });
            case "tara":
            case "taras":
            case "spider":
            case "taraxp":
            case "spiderxp":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is spider slayer ${getSlayerLvl(
                                    player.slayer_bosses.spider.xp
                                )} with ${dot(player.slayer_bosses.spider.xp)} xp`
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name} `);
                        });
                });
            case "sven":
            case "wolf":
            case "svenxp":
            case "wolfxp":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is wolf slayer ${getSlayerLvl(
                                    player.slayer_bosses.wolf.xp
                                )} with ${dot(player.slayer_bosses.wolf.xp)} xp`
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name} `);
                        });
                });
            case "void":
            case "eman":
            case "enderman":
            case "voidxp":
            case "emanxp":
            case "endermanxp":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is enderman slayer ${getSlayerLvl(
                                    player.slayer_bosses.enderman.xp
                                )
                                } with ${dot(player.slayer_bosses.enderman.xp)} xp`
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name} `);
                        });
                });
            case "slayerwe":
            case "slayerweight":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let allWeight = getSlayerWeight(player);
                            let we = allWeight.reduce((prev, [weight, overflow]) => prev + weight, 0);
                            let ov = allWeight.reduce((prev, [weight, overflow]) => prev + overflow, 0);
                            resolve(`${player.username} has ${shortenDot(we + ov)} slayer weight (${shortenDot(
                                we)} we / ${shortenDot(ov)} ov)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "sa":
            case "skill":
            case "skills":
            case "average":
            case "avg":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} has skill average ${parseFloat(findSA(player)
                                ).toFixed(2)
                                } (${parseFloat(
                                    findSA60(player).toFixed(2)
                                )
                                })`
                            );
                        })
                        .catch((e) => {
                            console.log(e)
                            reject(`Could not find ${name} `);
                        });
                });
            case "uncsa":
            case "uncappedsa":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} has a real skill average of ${parseFloat(findSA(player)
                                ).toFixed(2)
                                }, but uncapped it would be ${parseFloat(
                                    findSA60(player, true).toFixed(2)
                                )
                                } `
                            );
                        })
                        .catch((e) => {
                            console.log(e)
                            reject(`Could not find ${name} `);
                        });
                });
            case "combatxp":
            case "combat":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is combat ${parseFloat(findSkillLevel(player?.experience_skill_combat)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_combat, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_combat ?? 0
                                )
                                } combat xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "miningxp":
            case "mining":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is mining ${parseFloat(findSkillLevel(player?.experience_skill_mining)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_mining, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_mining ?? 0
                                )
                                } mining xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "foragingxp":
            case "foraging":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is foraging ${parseFloat(findSkillLevel(player?.experience_skill_foraging, true)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_foraging, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_foraging ?? 0
                                )
                                } foraging xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "enchantingxp":
            case "enchanting":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is enchanting ${parseFloat(findSkillLevel(player?.experience_skill_enchanting)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_enchanting, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_enchanting ?? 0
                                )
                                } enchanting xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "fishingxp":
            case "fishing":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is fishing ${parseFloat(findSkillLevel(player?.experience_skill_fishing, true)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_fishing, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_fishing ?? 0
                                )
                                } fishing xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "farmingxp":
            case "farming":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is farming ${parseFloat(findSkillLevel(player?.experience_skill_farming)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_farming, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_farming ?? 0
                                )
                                } farming xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "alchemyxp":
            case "alchemy":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is alchemy ${parseFloat(findSkillLevel(player?.experience_skill_alchemy, true)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_alchemy, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_alchemy ?? 0
                                )
                                } alchemy xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "tamingxp":
            case "taming":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is taming ${parseFloat(findSkillLevel(player?.experience_skill_taming, true)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_taming, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_taming ?? 0
                                )
                                } taming xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "carp":
            case "carpentryxp":
            case "carpentry":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is carpentry ${parseFloat(findSkillLevel(player?.experience_skill_carpentry, true)
                                ).toFixed(2)
                                } (${parseFloat(findSkillLevel(player?.experience_skill_carpentry, false, true)
                                ).toFixed(2)
                                }) with ${dot(
                                    player?.experience_skill_carpentry ?? 0
                                )
                                } carpentry xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "runecraftingxp":
            case "runecrafting":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is runecrafting ${parseFloat(findRunecraftingLevel(player?.experience_skill_runecrafting)
                                ).toFixed(2)
                                } with ${dot(
                                    player?.experience_skill_runecrafting ?? 0
                                )
                                } runecrafting xp`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "skillsxp":
            case "skillxp":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} has ${dot(
                                    (player.experience_skill_alchemy ?? 0) +
                                    (player.experience_skill_taming ?? 0) +
                                    (player.experience_skill_combat ?? 0) +
                                    (player.experience_skill_enchanting ?? 0) +
                                    (player.experience_skill_fishing ?? 0) +
                                    (player.experience_skill_foraging ?? 0) +
                                    (player.experience_skill_farming ?? 0) +
                                    (player.experience_skill_mining ?? 0)
                                )
                                } total skill xp(+${dot(
                                    (player.experience_skill_carpentry ?? 0) +
                                    (player.experience_skill_runecrafting ?? 0))
                                } cosmetic skill xp)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "skillwe":
            case "skillweight":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let allWeights = getSkillWeight(player);
                            let we = allWeights.reduce((prev, [weight, overflow]) => prev + weight, 0);
                            let ov = allWeights.reduce((prev, [weight, overflow]) => prev + overflow, 0);
                            resolve(
                                `${player.username} has ${shortenDot(we + ov)} skill weight (${shortenDot(
                                    we)} we / ${shortenDot(ov)} ov)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "we":
            case "weight":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let skillWeights = getSkillWeight(player);
                            let slayerWeights = getSlayerWeight(player);
                            let cataWeights = getDungeonWeight(player);

                            let skillWe = skillWeights.reduce((prev, [we, ov]) => prev + we, 0);
                            let skillOv = skillWeights.reduce((prev, [we, ov]) => prev + ov, 0);

                            let slayerWe = slayerWeights.reduce((prev, [we, ov]) => prev + we, 0);
                            let slayerOv = slayerWeights.reduce((prev, [we, ov]) => prev + ov, 0);

                            let cataWe = cataWeights.reduce((prev, [we, ov]) => prev + we, 0);
                            let cataOv = cataWeights.reduce((prev, [we, ov]) => prev + ov, 0);

                            resolve(
                                `${player.username} has ${shortenDot(skillWe + skillOv + slayerWe + slayerOv + cataWe + cataOv)
                                } weight (${shortenDot(slayerWe + slayerOv + skillWe + cataWe)} we / ${shortenDot(skillOv + cataOv)} ov)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "minionslots":
            case "minions":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixelFullProfile(name)
                        .then((profile) => {
                            let minionCount = 0;
                            let craftedMinions = 0;
                            let minionList = new Set([]);
                            for (let i in profile.community_upgrades.upgrade_states) {
                                if (
                                    profile.community_upgrades.upgrade_states[i].upgrade ==
                                    "minion_slots"
                                )
                                    minionCount++;
                            }
                            for (let player in profile.members) {
                                if ("crafted_generators" in profile.members[player])
                                    for (let i in profile.members[player].crafted_generators) {
                                        minionList.add(
                                            profile.members[player].crafted_generators[i]
                                        );
                                    }
                            }
                            craftedMinions = minionList.size;
                            //find minion count
                            if (craftedMinions >= 650) {
                                minionCount += 26;
                                craftedMinions -= 650;
                            } else if (craftedMinions >= 600) {
                                minionCount += 25;
                                craftedMinions -= 600;
                            } else if (craftedMinions >= 550) {
                                minionCount += 24;
                                craftedMinions -= 550;
                            } else if (craftedMinions >= 500) {
                                minionCount += 23;
                                craftedMinions -= 500;
                            } else if (craftedMinions >= 450) {
                                minionCount += 22;
                                craftedMinions -= 450;
                            } else if (craftedMinions >= 400) {
                                minionCount += 21;
                                craftedMinions -= 400;
                            } else if (craftedMinions >= 350) {
                                minionCount += 20;
                                craftedMinions -= 350;
                            } else if (craftedMinions >= 300) {
                                minionCount += 19;
                                craftedMinions -= 300;
                            } else if (craftedMinions >= 275) {
                                minionCount += 18;
                                craftedMinions -= 275;
                            } else if (craftedMinions >= 250) {
                                minionCount += 17;
                                craftedMinions -= 250;
                            } else if (craftedMinions >= 225) {
                                minionCount += 16;
                                craftedMinions -= 225;
                            } else if (craftedMinions >= 200) {
                                minionCount += 15;
                                craftedMinions -= 200;
                            } else if (craftedMinions >= 175) {
                                minionCount += 14;
                                craftedMinions -= 175;
                            } else if (craftedMinions >= 150) {
                                minionCount += 13;
                                craftedMinions -= 150;
                            } else if (craftedMinions >= 125) {
                                minionCount += 12;
                                craftedMinions -= 125;
                            } else if (craftedMinions >= 100) {
                                minionCount += 11;
                                craftedMinions -= 100;
                            } else if (craftedMinions >= 75) {
                                minionCount += 10;
                                craftedMinions -= 75;
                            } else if (craftedMinions >= 50) {
                                minionCount += 9;
                                craftedMinions -= 50;
                            } else if (craftedMinions >= 30) {
                                minionCount += 8;
                                craftedMinions -= 30;
                            } else if (craftedMinions >= 15) {
                                minionCount += 7;
                                craftedMinions -= 15;
                            } else if (craftedMinions >= 5) {
                                minionCount += 6;
                                craftedMinions -= 5;
                            } else {
                                minionCount += 5;
                            }

                            resolve(
                                `${profile.username} unlocked ${minionCount} /31  minion slots (${craftedMinions}/50 to next tier)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "location":
                return new Promise(function (resolve, reject) {
                    getPlayerStatus(name)
                        .then(async (player) => {
                            if (!player.session.online) {
                                //make sure they are actually offline and not just api disabled
                                let p2 = await getPlayerStatsHypixel(name);
                                if (p2.lastLogin > p2.lastLogout)
                                    resolve(
                                        `${p2.playername} is currently online but hides their location.Probably some roleplay housing`
                                    );
                                else resolve(`${player.username} is currently touching grass`);
                            } else if (player.session.gameType == "SKYBLOCK") {
                                switch (player.session.mode) {
                                    case "hub":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is currently begging for coins in a skyblock hub",
                                                "is checking if the wizard portal is fixed",
                                                "is crashing hub 2",
                                                "is at the hub selector, trying to find a splash",
                                                "is fishing for an update in the hub portal",
                                                "is filling their inventory with gold blocks at the bazaar",
                                                "is grinding a wolf talisman in the ruins",
                                                "is oak foraging with baritone",
                                                "is looking for a dragon party in hub 1",
                                                "is buying their daily npc limit for 40k profit in the hub",
                                                "is partying random players in the hub to invite them to their irl trading discord",
                                                "is voting for 2nfg through freecam",
                                                "is checking random hubs for hacked youtubers",
                                                "is in the hub and tried to get into the dark auction but was too poor",
                                                "is in the hub, scanning the crowd for exotics",
                                                "is running around useless circles in the hub and jumping from building to building for no reason",
                                                "is spam dropping their spirit bow in a hub",
                                                "is three-hitting revenant horrors in the hub",
                                                "is trying to find the carpenter in the hub",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "dynamic":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is f11 foraging on their island",
                                                "is afking their melon minions",
                                                "is scripting cane on their island",
                                                "is nuking wart on their island",
                                                "is experimenting with the experimentation table",
                                                "is building a huge dick on their island",
                                                "is trying to find that chest they put that one thing in a while back",
                                                "is voiding duped handles on their island",
                                                "is hiding their dupe stash on their island",
                                                "is visiting private islands of youtubers and begging for a screenie",
                                                "is visiting SirDeadlys island with a rabbit for a friend request",
                                                "is getting banned for gardening on their island",
                                                "is visiting glitched item museums",
                                                "is grinding #1 social on technoblades island",
                                                "is on TimeDeos island, waiting for Hasco to show up so they can report a scammer",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "combat_3":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is nuking endstone",
                                                "is grinding endstone golems",
                                                "is leaching dragons",
                                                "is trying to get an enderman pet",
                                                "is at 1082 zealots no eye",
                                                "can`t find the beacon",
                                                "is trying to hit their enderman boss between 9 souls",
                                                "is trying to figure out where their enderman boss spawned",
                                                "is autoclicking the shield phase of their enderman boss",
                                                "is fighting endermans with mob aura",
                                                "is trying to reach the beacon in the wall",
                                                "is at 12% RNG meter no drop",
                                                "is getting an ender slayer 7 book instead of a core",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "combat_2":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is in the blazing fortress because they heard farming wart is good for money",
                                                "is waiting for the magma boss to spawn",
                                                "grinding bestiary in the blazing fortress",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "combat_1":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is trying to find the last relic in the spiders den",
                                                "is losing all their money doing spider slayer",
                                                "is camping the peak of the mountain for a spider talisman",
                                                "is begging the grandma wolf to take back their candied grandma wolf",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "foraging_1":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is scripting the harp",
                                                "had their script desync in the park and is breaking trees with a fishing rod",
                                                "is trying to find romero in the park",
                                                "is rain fishing in the park",
                                                "is hoping to drop an overflux in the wolf cave",
                                                "is trying to mine unbreakable logs in the park with baritone",
                                                "is in the park, checking if foraging got fixed yet",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "farming_1":
                                        resolve(
                                            `${player.username} is in the farming islands for some reason`
                                        );
                                        break;
                                    case "dungeon_hub":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is salvaging their hyperion in the dungeon hub",
                                                "is scamming kids in the dungeon hub instead of selling essence",
                                                "is trying to join a dungeon in the dungeon hub but it breaks every time",
                                                "is complaining about downtime in the dungeon hub",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "dark_auction":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is spending their duped coins on a midas sword",
                                                "is trying to flip a flower minions",
                                                "is flexing their wealth in the dark auction",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "mining_1":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is in the gold mines like the non that they truly are",
                                                "is barn fishing in the gold mines",
                                                "is getting telekinesis from rusty",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "mining_2":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is grinding for a set of lapis armor",
                                                "is grinding miner armor for coins",
                                                "is grinding invisible creepers for bestiary kills",
                                                "is lowballing a non for their phoenix pet in the dwarven mines",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "mining_3":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is trying to find the lobby V3RLO is farming ghosts in",
                                                "is talking to a sheep in the dwarven mines",
                                                "is nuking mithril",
                                                "is afking goblins",
                                                "is throwing more bones at a powder ghast than humanly possible",
                                                "is making INSANE stonks from ghost grinding",
                                                "is trying to figure out what fetchur wants today",
                                                "is nuking cobble on top of the dwarven mines",
                                                "is breaking the same 10 blocks of mithril over and over again",
                                                "is fishing up a ghost to kill nons in the dwarven mines",
                                                "is asking for spare titanium in the dwarven mines",
                                                "is getting killed by ghosts in the dwarven mines",
                                                "is refueling their drill for the 37th time this hour",
                                                "is complaining about the non that stole their titanium",
                                                "is dying to a murderlover during a goblin raid",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "dungeon":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is duping secrets in a dungeon",
                                                "is haeling a bunch of terminals",
                                                "is using chest aura to clear the dungeon faster",
                                                "is prefiring in stage two of the Necron boss",
                                                "is sneaking over the deathmite pit, telling their team to leap",
                                                "is autoclicking simon says",
                                                "is testing their bone macro in dungeons",
                                                "is trying to transfer items to ironman in dungeons",
                                                "is working on their sub 4 pb with the help of freecam",
                                                "is trying to figure out why one of the livids is yellow",
                                                "is getting 1 handle every 2384 runs",
                                                "is rerolling their handle",
                                                "is failing tic tac toe",
                                                "is killing the blazes in the wrong order",
                                                "is placing traps around the silverfish",
                                                "is grinding for #1 LadyBleu Deaths",
                                                "is trying to suffocate their team with mage wall",
                                                "is knocking their team off the platform as a ghost",
                                                "is shadow furying into the deathmite pit",
                                                "is killing their tank on purpose by jumping into the deep hole",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "winter":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is duping yetis in the jerry island",
                                                "is trying to find that last present in the jerry island",
                                                "is defending the jerry village from evil magma cubes",
                                                "is spleefing nons that are fishing on the ice",
                                                "is trying to unlock jingle bells from the chicken race",
                                                "is killing other peoples yeti with a flower of truth",
                                                "is fishing with ice bait",
                                                "is complaining that the jerry island is too laggy for bazaar",
                                                "is waiting for their first pet in 57 yetis",
                                                "is burning grinches",
                                            ])
                                            } `
                                        );
                                        break;
                                    case "crystal_hollows":
                                        resolve(
                                            `${player.username} ${getRandomElement([
                                                "is using xray to find pink glass",
                                                "is catching butterflies",
                                                "is getting 100k worth of gems for completing the nucleus quest",
                                                "is trying to get a worm pet",
                                                "is mining gems",
                                                "is trying to find bal",
                                            ])
                                            } `
                                        );
                                        break;
                                    default: {
                                        resolve(`${player.username} is playing skyblock`);
                                    }
                                }
                            } else
                                resolve(
                                    `${player.username
                                    } is currently cheating in ${player.session.gameType.toLowerCase()} `
                                );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "gexplb":
            case "explb":
            case "xplb":
                return new Promise(function (resolve, reject) {
                    let splits = full.split(" ");
                    let page = 1;
                    let guildName = full;
                    let num = splits.pop();
                    if (!isNaN(num)) {
                        page = Math.max(1, num);
                        guildName = splits.join(" ");
                    }
                    getGuildByGuildName(guildName)
                        .then(async (data) => {
                            let guildMembers = [];
                            data.guild.members.forEach((member) => {
                                let gexp = Object.values(member.expHistory).reduce(
                                    (a, b) => a + b
                                );
                                guildMembers.push({ name: member.uuid, gexp: gexp });
                            });
                            guildMembers.sort((a, b) => b.gexp - a.gexp);
                            let output = "";
                            for (let i = 0; i <= 4; i++) {
                                output += (await getGexpPos(page, i, guildMembers)) + " ";
                            }
                            resolve(output);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find guild ${guildName} `);
                        });
                });
            case "spooky":
            case "spookyfestival":
                return new Promise(function (resolve, reject) {
                    getJsonFromUrl(
                        `https://hypixel-api.inventivetalent.org/api/skyblock/spookyFestival/estimate`
                    )
                        .then((data) => {
                            try {
                                let time = new Date(data.estimate).toLocaleString("en-US", {
                                    timeZone: name,
                                });
                                resolve(
                                    `Next spooky festival is ${data.estimateRelative} (${time})`
                                );
                            } catch (e) {
                                resolve(`Next spooky festival is ${data.estimateRelative}`);
                            }
                        })
                        .catch((e) => {
                            reject(`Error loading calendar`);
                        });
                });
            case "interest":
                return new Promise(function (resolve, reject) {
                    getJsonFromUrl(
                        `https://hypixel-api.inventivetalent.org/api/skyblock/interest/estimate`
                    )
                        .then((data) => {
                            try {
                                let time = new Date(data.estimate).toLocaleString("en-US", {
                                    timeZone: name,
                                });
                                resolve(`Next interest is ${data.estimateRelative} (${time})`);
                            } catch (e) {
                                resolve(`Next interest is ${data.estimateRelative}`);
                            }
                        })
                        .catch((e) => {
                            reject(`Error loading calendar`);
                        });
                });
            case "jerry":
            case "yeti":
            case "winterevent":
            case "icefishing":
            case "winter":
            case "yetifishing":
                return new Promise(function (resolve, reject) {
                    getJsonFromUrl(
                        `https://hypixel-api.inventivetalent.org/api/skyblock/jerryWorkshop/estimate`
                    )
                        .then((data) => {
                            try {
                                let time = new Date(data.estimate).toLocaleString("en-US", {
                                    timeZone: name,
                                });
                                let endTime = new Date(data.endEstimate).toLocaleString(
                                    "en-US",
                                    { timeZone: name }
                                );
                                resolve(
                                    `Next jerry island opens ${data.estimateRelative} and closes ${data.endEstimateRelative} (${time} - ${endTime})`
                                );
                            } catch (e) {
                                resolve(
                                    `Next jerry island opens ${data.estimateRelative} and closes ${data.endEstimateRelative}`
                                );
                            }
                        })
                        .catch((e) => {
                            reject(`Error loading calendar`);
                        });
                });
            case "golds":
            case "medals":
            case "contests":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let totalGolds = 0;
                            let golds = {};
                            for (let name in player.jacob2.contests) {
                                let contest = player.jacob2.contests[name];
                                if (
                                    "claimed_position" in contest &&
                                    "claimed_participants" in contest
                                )
                                    if (
                                        contest.claimed_position / contest.claimed_participants <=
                                        0.05
                                    ) {
                                        totalGolds++;
                                        let type = name.split(":").slice(2);
                                        type = type.join(":");
                                        if (!(type in golds)) golds[type] = 1;
                                        else golds[type]++;
                                    }
                            }
                            let sorted = Object.keys(golds).sort(
                                (a, b) => golds[b] - golds[a]
                            );
                            let result = `${player.username} earned ${"unique_golds2" in player.jacob2
                                ? player.jacob2.unique_golds2.length
                                : 0
                                } unique gold medals and ${totalGolds} golds in total`;
                            if (sorted.length == 0) {
                                resolve(result);
                                return;
                            }
                            if (sorted.length > 0) {
                                let key = sorted[0];
                                result += ` (${fixFarmingNames(key)}: ${golds[key]}`;
                            }
                            if (sorted.length > 1) {
                                let key = sorted[1];
                                result += `, ${fixFarmingNames(key)}: ${golds[key]}`;
                            } else {
                                resolve(result + ")");
                                return;
                            }
                            if (sorted.length > 2) {
                                let key = sorted[2];
                                result += `, ${fixFarmingNames(key)}: ${golds[key]}`;
                            } else {
                                resolve(result + ")");
                                return;
                            }
                            resolve(result + ")");
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "logs":
            case "wood":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            if (!("collection" in player))
                                resolve(`${player.username} did not enable collection API`);
                            let woodCollections = {};
                            if ("LOG" in player.collection)
                                woodCollections.oak = player.collection.LOG;
                            if ("LOG:1" in player.collection)
                                woodCollections.spruce = player.collection["LOG:1"];
                            if ("LOG:2" in player.collection)
                                woodCollections.birch = player.collection["LOG:2"];
                            if ("LOG:3" in player.collection)
                                woodCollections.jungle = player.collection["LOG:3"];
                            if ("LOG_2" in player.collection)
                                woodCollections.acacia = player.collection["LOG_2"];
                            if ("LOG_2:1" in player.collection)
                                woodCollections["dark oak"] = player.collection["LOG_2:1"];
                            let totalWood = Object.values(woodCollections).reduce(
                                (a, b) => a + b
                            );
                            let sorted = Object.keys(woodCollections).sort(
                                (a, b) => woodCollections[b] - woodCollections[a]
                            );
                            let result = `${player.username} broke a total of ${dot(
                                totalWood
                            )} logs`;
                            if (sorted.length == 0) {
                                resolve(result);
                                return;
                            }
                            if (sorted.length > 0) {
                                let key = sorted[0];
                                result += ` (Favorite trees: ${key}: ${parseInt(
                                    100 * (woodCollections[key] / totalWood)
                                )}%`;
                            }
                            if (sorted.length > 1) {
                                let key = sorted[1];
                                result += `, ${key}: ${parseInt(
                                    100 * (woodCollections[key] / totalWood)
                                )}%`;
                            } else {
                                resolve(result + ")");
                                return;
                            }
                            if (sorted.length > 2) {
                                let key = sorted[2];
                                result += `, ${key}: ${parseInt(
                                    100 * (woodCollections[key] / totalWood)
                                )}%`;
                            } else {
                                resolve(result + ")");
                                return;
                            }
                            resolve(result + ")");
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "gold":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            if (!("collection" in player))
                                resolve(`${player.username} did not enable collection API`);
                            if ("GOLD_INGOT" in player.collection)
                                resolve(`${player.username} mined ${dot(player.collection.GOLD_INGOT)} gold`)

                            resolve(`${player.username} did not mine any gold yet`)
                        }).catch((e) => {
                            reject(`Could not find ${name}`);
                        });;
                });
            case "roles":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let roles = [];
                        }).catch((e) => {
                            reject(`Could not find ${name}`);
                        });;
                });
            case "ah":
            case "auctions":
                return new Promise(function (resolve, reject) {
                    getAuctionInfo(name)
                        .then((data) => {
                            let unclaimedCoins = 0;
                            let expiredAuctions = 0;
                            let activeAuctions = 0;
                            let nextEnd = null;
                            let endText = "";
                            let auctionText = "";
                            let ongoingCoins = 0;
                            data.auctions.forEach((auction) => {
                                if (
                                    "claimed" in auction &&
                                    !auction.claimed &&
                                    "auctioneer" in auction &&
                                    auction.auctioneer == data.uuid
                                ) {
                                    if (Date.now() > auction.end) {
                                        if (auction.highest_bid_amount == 0) expiredAuctions++;
                                        else unclaimedCoins += auction.highest_bid_amount;
                                    } else {
                                        activeAuctions++;
                                        ongoingCoins += auction.highest_bid_amount;
                                        if (nextEnd == null || nextEnd > auction.end)
                                            nextEnd = auction.end;
                                    }
                                }
                            });
                            if (nextEnd != null) {
                                let timeLeft = nextEnd - Date.now();
                                endText = `(${getTimeString(
                                    timeLeft
                                )}left on shortest auction)`;
                                auctionText = ` totaling ${dot(ongoingCoins)} coins `;
                            }
                            resolve(
                                `${data.username
                                } has ${activeAuctions} ongoing auctions${auctionText}${endText}. ${expiredAuctions} auctions expired, ${dot(
                                    unclaimedCoins
                                )} unclaimed coins`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "glb":
            case "guildlb":
            case "guildleaderboard":
                return new Promise(function (resolve, reject) {
                    let parts = full.split(" ");
                    let page = 1;
                    let category = "weight";
                    if (parts.length > 0) {
                        if (!isNaN(parts[0])) {
                            page = Math.max(1, parts[0]);
                        } else {
                            switch (parts[0]) {
                                case "sa":
                                case "skill":
                                case "skills":
                                case "average":
                                case "avg":
                                    category = "skills";
                                    break;
                                case "slayer":
                                case "slayers":
                                    category = "slayer";
                                    break;
                                case "catacombs":
                                case "catacombsxp":
                                case "cataxp":
                                case "cata":
                                case "dung":
                                case "dungeons":
                                    category = "dungeon";
                                    break;
                            }
                            if (parts.length > 1 && !isNaN(parts[1])) {
                                page = Math.max(parts[1]);
                            }
                        }
                    }
                    getJsonFromUrl("https://hypixel-app-api.senither.com/leaderboard/")
                        .then((data) => {
                            let getCategory = (data) => {
                                switch (category) {
                                    case "skills":
                                        return data.average_skill_progress;
                                    case "slayer":
                                        return data.average_slayer;
                                    case "dungeon":
                                        return data.average_catacomb;
                                    default:
                                        return data.weight.total;
                                }
                            };
                            let sorted = data.data
                                .filter((a) => a.members >= 5)
                                .sort((a, b) => getCategory(b) - getCategory(a));
                            let result = "";
                            for (let i = (page - 1) * 5; i < page * 5; i++) {
                                if (i < sorted.length)
                                    result += `#${i + 1}: ${sorted[i].name} (${shortenDot(
                                        getCategory(sorted[i])
                                    )}) `;
                            }
                            resolve(result);
                        })
                        .catch((e) => {
                            reject(`Error requesting leaderboard`);
                        });
                });
            case "nh":
            case "namehistory":
            case "namechanges":
                return new Promise(function (resolve, reject) {
                    getPlayerUUID(name)
                        .then(async (uuidInfo) => {
                            if (uuidInfo == null) {
                                resolve("No player with that name");
                                return;
                            }
                            let nameInfo = await getJsonFromUrl(
                                `https://api.mojang.com/user/profiles/${uuidInfo.uuid}/names`
                            );
                            if (nameInfo.length == 1) {
                                resolve(`${uuidInfo.name} never changed their name`);
                                return;
                            }
                            let sorted = nameInfo.sort(
                                (a, b) =>
                                    ("changedToAt" in b ? b.changedToAt : 0) -
                                    ("changedToAt" in a ? a.changedToAt : 0)
                            );
                            let result = `Past names for ${uuidInfo.name}: `;
                            for (let i = 1; i < 5; i++) {
                                if (i < sorted.length) result += sorted[i].name;
                                if (i == sorted.length - 1 || i == 4) break;
                                else result += ", ";
                            }
                            resolve(result);
                        })
                        .catch((e) => reject(`Could not find ${name}`));
                });
            case "games":
                return new Promise(function (resolve, reject) {
                    getGuildByGuildName(full)
                        .then((data) => {
                            if (data == null) return;
                            let sorted = Object.keys(data.guild.guildExpByGameType).sort(
                                (a, b) =>
                                    data.guild.guildExpByGameType[b] -
                                    data.guild.guildExpByGameType[a]
                            );
                            let total = Object.values(data.guild.guildExpByGameType).reduce(
                                (a, b) => a + b
                            );
                            let fixGameName = (name) =>
                                name
                                    .toLowerCase()
                                    .replace("_", " ")
                                    .replace("prototype", "skyblock");
                            let result = `Most played games in ${data.guild.name}: `;
                            for (let i = 0; i < 5; i++) {
                                result += `#${i + 1}: ${fixGameName(sorted[i])} (${parseInt(
                                    (100 * data.guild.guildExpByGameType[sorted[i]]) / total
                                )}%)`;
                                if (i < 4) result += ", ";
                            }
                            resolve(result);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "yetis":
            case "yetikills":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} killed ${dot(
                                    player.stats.kills_yeti
                                )} yetis`
                            );
                        })
                        .catch((e) => {
                            console.log(e)
                            reject(`Could not find ${name} `);
                        });
                });
            case "classes":
            case "classaverage":
            case "ca":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name).then((player) =>
                        resolve(
                            `${player.username} has a dungeon class average of ${parseFloat(
                                (findCataLvl(player.dungeons.player_classes.mage.experience, false) +
                                    findCataLvl(player.dungeons.player_classes.archer.experience, false) +
                                    findCataLvl(player.dungeons.player_classes.berserk.experience, false) +
                                    findCataLvl(player.dungeons.player_classes.healer.experience, false) +
                                    findCataLvl(player.dungeons.player_classes.tank.experience, false)) /
                                5
                            ).toFixed(2)} (${parseFloat(
                                (findCataLvl(player.dungeons.player_classes.mage.experience, true) +
                                    findCataLvl(player.dungeons.player_classes.archer.experience, true) +
                                    findCataLvl(player.dungeons.player_classes.berserk.experience, true) +
                                    findCataLvl(player.dungeons.player_classes.healer.experience, true) +
                                    findCataLvl(player.dungeons.player_classes.tank.experience, true)) /
                                5
                            ).toFixed(2)})`
                        )
                    );
                });
            case "ratelimit":
                return new Promise(function (resolve, reject) {
                    resolve(
                        `There are ${remainingRequests} requests remaining. Refreshes in ${timeTillReset} seconds`
                    );
                });
            case "commissions":
            case "coms":
            case "comms":
                return new Promise(function (resolve, reject) {
                    getPlayerStatsHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.playername} completed ${dot(
                                    player.achievements.skyblock_hard_working_miner
                                )} commissions for the king`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "stars":
            case "bwstars":
            case "bedwarsstars":
                return new Promise(function (resolve, reject) {
                    getPlayerStatsHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.playername} has ${dot(
                                    player.achievements.bedwars_level
                                )} bedwars stars`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "friends":
            case "fl":
                return new Promise(function (resolve, reject) {
                    getPlayerFriends(name)
                        .then((player) => {
                            resolve(
                                `${player.username} has ${dot(
                                    Object.keys(player.records).length
                                )} friends`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });
            case "blood":
            case "watcher":
            case "bloodkills":
            case "watcherkills":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let watcher_kills = 0;
                            let master_watcher_kills = 0;
                            if ("kills_watcher_summon_undead" in player.stats)
                                watcher_kills = player.stats.kills_watcher_summon_undead;
                            if ("kills_master_watcher_summon_undead" in player.stats)
                                master_watcher_kills =
                                    player.stats.kills_master_watcher_summon_undead;
                            let total_kills = watcher_kills + master_watcher_kills;
                            resolve(
                                `${player.username} killed ${dot(total_kills)} blood mobs` +
                                (total_kills > 0
                                    ? ` (${parseInt(
                                        (master_watcher_kills / total_kills) * 100
                                    )}% mastermode)`
                                    : "")
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name} `);
                        });
                });

            case "powder":
            case "gempowder":
            case "mithrilpowder":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            if (!("mining_core" in player))
                                resolve(`${player.username} never entered the dwarven mines`);
                            resolve(
                                `${player.username} has a total of ${dot(
                                    player.mining_core.powder_mithril +
                                    player.mining_core.powder_spent_mithril
                                )} mithril powder and ${dot(
                                    player.mining_core.powder_gemstone +
                                    player.mining_core.powder_spent_gemstone
                                )} gemstone powder`.replace(/NaN/g, "0")
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`${name} collected no mining powders`);
                        });
                });

            case "hotm":
            case "heartofthemountain":
                return new Promise(function (resolve, reject) {
                    getHotmLvl = (xp) => {
                        if (xp < 3000) return 1;
                        if (xp < 12000) return 2;
                        if (xp < 37000) return 3;
                        if (xp < 97000) return 4;
                        if (xp < 197000) return 5;
                        if (xp < 347000) return 6;
                        return 7;
                    };
                    getPlayerHypixel(name)
                        .then((player) => {
                            if (!("mining_core" in player))
                                resolve(`${player.username} never entered the dwarven mines`);
                            resolve(
                                `${player.username} is hotm level ${getHotmLvl(
                                    player.mining_core.experience
                                )} with ${dot(player.mining_core.experience)} hotm xp`
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`${name} did not join the dwarven mines`);
                        });
                });

            case "nucleus":
            case "nucleusruns":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            if (!("mining_core" in player))
                                resolve(`${player.username} never entered the dwarven mines`);
                            resolve(
                                `${player.username} completed ${player.mining_core.crystals.jade_crystal.total_placed} nucleus runs`.replace(
                                    "undefined",
                                    0
                                )
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`${name} did not complete any nucleus runs.`);
                        });
                });

            case "essence":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} has ${player.essence_wither} wither, ${player.essence_undead} undead, ${player.essence_gold} gold, ` +
                                `${player.essence_diamond} diamond, ${player.essence_spider} spider, ${player.essence_dragon} dragon and ${player.essence_ice} ice essence`.replace(
                                    /NaN/g,
                                    0
                                )
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`${name} did not enable inventory API`);
                        });
                });
            case "blaze":
            case "blazexp":
            case "inferno":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} is blaze slayer ${getSlayerLvl(
                                    player.slayer_bosses.blaze.xp
                                )} with ${dot(player.slayer_bosses.blaze.xp)} xp`
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name} `);
                        });
                });

            case "ghost":
            case "ghosts":
            case "ghostkills":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            resolve(
                                `${player.username} killed ${dot(
                                    player.stats.kills_caverns_ghost
                                )} ghosts`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "gushie":
            case "gusher":
            case "gushies":
            case "gushers":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.gusher_bronze ?? 0;
                            let silver = player.trophy_fish.gusher_silver ?? 0;
                            let gold = player.trophy_fish.gusher_gold ?? 0;
                            let diamond = player.trophy_fish.gusher_diamond ?? 0;
                            let total = player.trophy_fish.gusher ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond gushers (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "slugie":
            case "slugfish":
            case "sluggie":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.slugfish_bronze ?? 0;
                            let silver = player.trophy_fish.slugfish_silver ?? 0;
                            let gold = player.trophy_fish.slugfish_gold ?? 0;
                            let diamond = player.trophy_fish.slugfish_diamond ?? 0;
                            let total = player.trophy_fish.slugfish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond slugfish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "blobbie":
            case "blobies":
            case "blobie":
            case "blobbies":
            case "blobfish":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.blobfish_bronze ?? 0;
                            let silver = player.trophy_fish.blobfish_silver ?? 0;
                            let gold = player.trophy_fish.blobfish_gold ?? 0;
                            let diamond = player.trophy_fish.blobfish_diamond ?? 0;
                            let total = player.trophy_fish.blobfish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond blobfish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "golden":
            case "goldfish":
            case "goldenfish":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.golden_fish_bronze ?? 0;
                            let silver = player.trophy_fish.golden_fish_silver ?? 0;
                            let gold = player.trophy_fish.golden_fish_gold ?? 0;
                            let diamond = player.trophy_fish.golden_fish_diamond ?? 0;
                            let total = player.trophy_fish.golden_fish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond golden fish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "stonefish":
            case "volcanic":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.volcanic_stonefish_bronze ?? 0;
                            let silver = player.trophy_fish.volcanic_stonefish_silver ?? 0;
                            let gold = player.trophy_fish.volcanic_stonefish_gold ?? 0;
                            let diamond = player.trophy_fish.volcanic_stonefish_diamond ?? 0;
                            let total = player.trophy_fish.volcanic_stonefish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond volcanic stonefish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "mana":
            case "manafish":
            case "manaray":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.mana_ray_bronze ?? 0;
                            let silver = player.trophy_fish.mana_ray_silver ?? 0;
                            let gold = player.trophy_fish.mana_ray_gold ?? 0;
                            let diamond = player.trophy_fish.mana_ray_diamond ?? 0;
                            let total = player.trophy_fish.mana_ray ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond mana rays (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "obfuscated":
            case "obf":
            case "obfuscated1":
            case "obf1":
            case "tier1":
            case "t1":
            case "corrupted1":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.obfuscated_fish_1_bronze ?? 0;
                            let silver = player.trophy_fish.obfuscated_fish_1_silver ?? 0;
                            let gold = player.trophy_fish.obfuscated_fish_1_gold ?? 0;
                            let diamond = player.trophy_fish.obfuscated_fish_1_diamond ?? 0;
                            let total = player.trophy_fish.obfuscated_fish_1 ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond obfuscated 1 (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "t2":
            case "tier2":
            case "obfuscated2":
            case "obf2":
            case "corrupted2":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.obfuscated_fish_2_bronze ?? 0;
                            let silver = player.trophy_fish.obfuscated_fish_2_silver ?? 0;
                            let gold = player.trophy_fish.obfuscated_fish_2_gold ?? 0;
                            let diamond = player.trophy_fish.obfuscated_fish_2_diamond ?? 0;
                            let total = player.trophy_fish.obfuscated_fish_2 ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond obfuscated 2 (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "t3":
            case "tier3":
            case "obfuscated3":
            case "obf3":
            case "corrupted3":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.obfuscated_fish_3_bronze ?? 0;
                            let silver = player.trophy_fish.obfuscated_fish_3_silver ?? 0;
                            let gold = player.trophy_fish.obfuscated_fish_3_gold ?? 0;
                            let diamond = player.trophy_fish.obfuscated_fish_3_diamond ?? 0;
                            let total = player.trophy_fish.obfuscated_fish_3 ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond corrupted 3 (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "lavahorse":
            case "horse":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.lava_horse_bronze ?? 0;
                            let silver = player.trophy_fish.lava_horse_silver ?? 0;
                            let gold = player.trophy_fish.lava_horse_gold ?? 0;
                            let diamond = player.trophy_fish.lava_horse_diamond ?? 0;
                            let total = player.trophy_fish.lava_horse ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond lava horses (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "mold":
            case "moldfin":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.moldfin_bronze ?? 0;
                            let silver = player.trophy_fish.moldfin_silver ?? 0;
                            let gold = player.trophy_fish.moldfin_gold ?? 0;
                            let diamond = player.trophy_fish.moldfin_diamond ?? 0;
                            let total = player.trophy_fish.moldfin ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond moldfin (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "karate":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.karate_fish_bronze ?? 0;
                            let silver = player.trophy_fish.karate_fish_silver ?? 0;
                            let gold = player.trophy_fish.karate_fish_gold ?? 0;
                            let diamond = player.trophy_fish.karate_fish_diamond ?? 0;
                            let total = player.trophy_fish.karate_fish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond karate fish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "soul":
            case "soulfish":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.soul_fish_bronze ?? 0;
                            let silver = player.trophy_fish.soul_fish_silver ?? 0;
                            let gold = player.trophy_fish.soul_fish_gold ?? 0;
                            let diamond = player.trophy_fish.soul_fish_diamond ?? 0;
                            let total = player.trophy_fish.soul_fish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond soul fish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "vanille":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.vanille_bronze ?? 0;
                            let silver = player.trophy_fish.vanille_silver ?? 0;
                            let gold = player.trophy_fish.vanille_gold ?? 0;
                            let diamond = player.trophy_fish.vanille_diamond ?? 0;
                            let total = player.trophy_fish.vanille ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond vanilles (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "skeleton":
            case "skeletonfish":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.skeleton_fish_bronze ?? 0;
                            let silver = player.trophy_fish.skeleton_fish_silver ?? 0;
                            let gold = player.trophy_fish.skeleton_fish_gold ?? 0;
                            let diamond = player.trophy_fish.skeleton_fish_diamond ?? 0;
                            let total = player.trophy_fish.skeleton_fish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond skeleton fish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "sulphur":
            case "skitters":
            case "skitter":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.sulphur_skitter_bronze ?? 0;
                            let silver = player.trophy_fish.sulphur_skitter_silver ?? 0;
                            let gold = player.trophy_fish.sulphur_skitter_gold ?? 0;
                            let diamond = player.trophy_fish.sulphur_skitter_diamond ?? 0;
                            let total = player.trophy_fish.sulphur_skitter ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond sulphur skitters (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "flyfish":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.flyfish_bronze ?? 0;
                            let silver = player.trophy_fish.flyfish_silver ?? 0;
                            let gold = player.trophy_fish.flyfish_gold ?? 0;
                            let diamond = player.trophy_fish.flyfish_diamond ?? 0;
                            let total = player.trophy_fish.flyfish ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond flyfish (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });
            case "steaming":
            case "steaminghot":
            case "flounder":
            case "flounders":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let bronze = player.trophy_fish.steaming_hot_flounder_bronze ?? 0;
                            let silver = player.trophy_fish.steaming_hot_flounder_silver ?? 0;
                            let gold = player.trophy_fish.steaming_hot_flounder_gold ?? 0;
                            let diamond = player.trophy_fish.steaming_hot_flounder_diamond ?? 0;
                            let total = player.trophy_fish.steaming_hot_flounder ?? 0;

                            resolve(
                                `${player.username} fished up ${dot(bronze)} bronze, ${dot(silver)} silver, ${dot(gold)} gold and ${dot(diamond)} diamond steaming hot flounders (${dot(total)} total)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "be":
            case "bestiary":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let tiers = 0
                            let maxed = 0;
                            let total = 0;
                            Object.values(bestiary).forEach(island => {
                                let max = 0;
                                island.mobs.forEach(mob => {
                                    total++;
                                    let kills = mob.mobs.reduce((prev, cur) => prev + (player?.bestiary?.kills?.[cur] || 0), 0);
                                    if (kills >= mob.cap) maxed++;
                                    if (kills >= mob.cap) max++;
                                    let bracket = bestiaryTiers[mob.bracket];
                                    let ms = 0;
                                    for (let n of bracket) {
                                        if (n > mob.cap) break;
                                        if (n <= kills) tiers++;
                                        if (n <= kills) ms++;
                                        else break;
                                    }
                                    // console.log(mob.name + ": " + ms + " (" + kills + "/" + mob.cap + ")")
                                })
                                // console.log(island.name + ": " + island.mobs.length + " (" + max + ")\n--------------------")
                            })
                            // console.log(JSON.stringify(player.bestiary.kills, null, 2))
                            resolve(`${player.username} is bestiary level ${tiers / 10} (${maxed}/${total} categories maxed)`)
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "kuudra":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let t1 = player?.nether_island_player_data?.kuudra_completed_tiers?.none ?? 0;
                            let t2 = player?.nether_island_player_data?.kuudra_completed_tiers?.hot ?? 0;
                            let t3 = player?.nether_island_player_data?.kuudra_completed_tiers?.burning ?? 0;
                            let t4 = player?.nether_island_player_data?.kuudra_completed_tiers?.fiery ?? 0;
                            let t5 = player?.nether_island_player_data?.kuudra_completed_tiers?.infernal ?? 0;

                            resolve(
                                `${player.username} completed ${dot(t1)} t1, ${dot(t2)} t2, ${dot(t3)} t3, ${dot(t4)} t4 and ${dot(t5)} t5 kuudra fights (${dot(t1 + t2 + t3 + t4 + t5)} total, ${dot(t1 + 2 * t2 + 3 * t3 + 4 * t4 + 5 * t5)} collection)`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "dojo":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let force = player?.nether_island_player_data?.dojo?.dojo_points_mob_kb ?? 0;
                            let stamina = player?.nether_island_player_data?.dojo?.dojo_points_wall_jump ?? 0;
                            let mastery = player?.nether_island_player_data?.dojo?.dojo_points_archer ?? 0;
                            let discipline = player?.nether_island_player_data?.dojo?.dojo_points_sword_swap ?? 0;
                            let swiftness = player?.nether_island_player_data?.dojo?.dojo_points_snake ?? 0;
                            let tenacity = player?.nether_island_player_data?.dojo?.dojo_points_fireball ?? 0;

                            resolve(
                                `Dojo highscores for ${player.username}: ${dot(force)} Force, ${dot(stamina)} Stamina, ${dot(mastery)} Mastery, ${dot(discipline)} Discipline, ${dot(swiftness)} Swiftness, ${dot(tenacity)} Tenacity. Total score: ${dot(force + stamina + mastery + discipline + tenacity + swiftness)}`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "pepper":
            case "peppers":
            case "reaperpepper":
            case "reaperpeppers":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let peppers = player?.reaper_peppers_eaten ?? 0;

                            resolve(
                                `${player.username} ate ${dot(peppers)} reaper peppers`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });


            case "soulflow":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let soulflow = player?.soulflow ?? 0;

                            resolve(
                                `${player.username} has ${dot(soulflow)} soulflow available`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });


            case "crimson":
            case "crimsonessence":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let essence = player?.essence_crimson ?? -1;

                            resolve(essence === -1 ? `${player.username} did not enable inventory API` :
                                `${player.username} has ${dot(essence)} crimson essence`
                            );
                        })
                        .catch((e) => {
                            reject(`Could not find ${name}`);
                        });
                });

            case "dragon":
            case "dragons":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let dragons = player?.stats?.kills_superior_dragon ?? 0;
                            dragons += player?.stats?.kills_protector_dragon ?? 0;
                            dragons += player?.stats?.kills_unstable_dragon ?? 0;
                            dragons += player?.stats?.kills_old_dragon ?? 0;
                            dragons += player?.stats?.kills_strong_dragon ?? 0;
                            dragons += player?.stats?.kills_young_dragon ?? 0;
                            dragons += player?.stats?.kills_wise_dragon ?? 0;
                            let superior = player?.stats?.kills_superior_dragon ?? 0;

                            resolve(`${player.username} fought ${dot(dragons)} dragons, ${superior} of those being superior dragons ` + (dragons ? '(' + shortenDot(100 * superior / dragons) + '%)' : '')
                            );
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });

            case "rep":
            case "reputation":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let faction = player?.nether_island_player_data?.selected_faction
                            let mage = player?.nether_island_player_data?.mages_reputation ?? 0;
                            let barb = player?.nether_island_player_data?.barbarians_reputation ?? 0;
                            let response = faction ? `${player.username} is part of the ${faction === 'mages' ? 'mage' : 'barbarian'} faction with ${dot(mage)} mage and ${dot(barb)} barbarian reputation` : `${player.username} is not part of any faction yet.`
                            resolve(response);

                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });

            case "pelt":
            case "pelts":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let pelts = player?.trapper_quest?.pelt_count ?? 0;
                            let response = `${player.username} has ${pelts} pelts.`
                            resolve(response);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });

            case "social":
            case "socialxp":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let xp = player?.experience_skill_social2 ?? 0;
                            if (xp) {
                                let response = `${player.username} is social ${parseFloat(findSocialLevel(xp)).toFixed(2)} with ${dot(xp)} social xp.`
                                resolve(response);
                            } else {
                                resolve(`${player.username} did not enable skill API.`)
                            }
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "sb":
            case "lvl":
            case "sblvl":
            case "sblevel":
            case "sbxp":
            case "level":
            case "skyblocklevel":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then((player) => {
                            let xp = (player?.leveling?.experience ?? 0) / 100;
                            resolve(`${player.username} is skyblock level ${xp.toFixed(2)}.`);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });


            case "networth":
            case "nw":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixelFullProfile(name)
                        .then(async (player) => {
                            let networth = await getNetworth(player.members[player.uuid], player?.banking?.balance);
                            let nw = networth.networth;
                            let soulbound = networth.networth - networth.unsoulboundNetworth;
                            resolve(`${player.username} has a networth of ${space(nw)} (${space(soulbound)} soulbound).`);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "mp":
            case "magicpower":
            case "accessories":
            case "talismans":
            case "tali":
            case "talis":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then(async (player) => {
                            let mp = await getMagicPower(player)
                            resolve(`${player.username} has ${dot(mp)} magic power.`);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });
            case "pets":
            case "petscore":
                return new Promise(function (resolve, reject) {
                    getPlayerHypixel(name)
                        .then(async (profile) => {
                            let pets = {};
                            let getRarityValue = (rarity) => {
                                switch (rarity) {
                                    case 'MYTHIC': return 6;
                                    case 'LEGENDARY': return 5;
                                    case 'EPIC': return 4;
                                    case 'RARE': return 3;
                                    case 'UNCOMMON': return 2;
                                    case 'COMMON': return 1;
                                    default:
                                        return 0;
                                }
                            }
                            let getMaxXpRequired = (rarity) => {
                                switch (rarity) {
                                    case 'EPIC': return 18_608_500;
                                    case 'RARE': return 12_626_665;
                                    case 'UNCOMMON': return 8_644_220;
                                    case 'COMMON': return 5_624_785;
                                    default:
                                        return 25_353_230;
                                }
                            }
                            profile?.pets?.forEach(pet => {
                                let type = pet.type;
                                let rarity = pet.tier;
                                if (type === 'JERRY' && pet.heldItem === 'PET_ITEM_TOY_JERRY') rarity = 'MYTHIC';
                                if (type === 'BAT' && pet.heldItem === 'PET_ITEM_VAMPIRE_FANG') rarity = 'MYTHIC';
                                // comment this in once wisp pet stacking is fixed
                                //if (type.includes('WISP')) type = 'WISP';
                                let value = getRarityValue(rarity);
                                if (pet.exp >= getMaxXpRequired(rarity)) value++;
                                if (value > (pets?.[type] || 0))
                                    pets[type] = value;
                            })
                            let petscore = Object.values(pets).reduce((prev, val) => prev + val, 0);
                            resolve(`${profile.username} has a petscore of ${dot(petscore)}.`);
                        })
                        .catch((e) => {
                            console.log(e);
                            reject(`Could not find ${name}`);
                        });
                });

        }
    }
}

let getRarityValue = (rarity) => {
    switch (rarity) {
        case 'MYTHIC': return 6;
        case 'LEGENDARY': return 5;
        case 'EPIC': return 4;
        case 'RARE': return 3;
        case 'UNCOMMON': return 2;
        case 'COMMON': return 1;
        default:
            return 0;
    }
}
let findBestiaryLvl = (killAmount, boss = false, privateIsland = false) => {
    const normalKills = [10, 15, 75, 150, 250, 500, 1500, 2500, 5000, 15000, 25000, 50000]
    const bossKills = [2, 3, 5, 10, 10, 10, 10, 25, 25, 50, 50]
    let amount = killAmount ?? 0;
    let kills = boss ? bossKills : normalKills
    let level = 0;
    for (let kill of kills) {
        if (amount >= kill) {
            amount -= kill;
            level++;
        } else {
            break;
        }
    }
    let further = boss ? 100 : 100000;
    level += parseInt(amount / further);
    level = Math.min(41, level);
    return privateIsland ? Math.min(5, level) : level;
}


let getMagicPower = async (profile) => {
    let getTalismanContents = async (data) => {
        if (!data) return;
        return getInventoryContents(data)
    }

    let getInventoryContents = async (base64) => {
        const buffer = Buffer.from(base64, "base64");
        const data = await nbt.parse(buffer);
        return data?.parsed?.value?.i?.value?.value;
    }
    const talismans = await getTalismanContents(profile?.talisman_bag?.data);
    let value = 0;
    let talismanObj = {};
    talismans?.forEach(talisman => {
        const name = talisman?.tag?.value?.ExtraAttributes?.value?.id?.value || 'invalid'
        if (name === 'invalid') return;
        var rarity = 0;
        var line = 'invalid';
        if (name.includes('CAMPFIRE_TALISMAN')) {
            const level = parseInt(name.split('_').pop()) + 1 || 0;
            if (level > 4) rarity++;
            if (level > 8) rarity++;
            if (level > 13) rarity++;
            if (level > 21) rarity++;
            if (talisman?.tag?.value?.ExtraAttributes?.value?.rarity_upgrades?.value === 1)
                rarity++;
            line = 'CAMPFIRE';
        } else if (name === 'PANDORAS_BOX') {
            switch (talisman?.tag?.value?.ExtraAttributes?.value?.['pandora-rarity']?.value || 'COMMON') {
                case "COMMON":
                    rarity = 0;
                    break;
                case "UNCOMMON":
                    rarity = 1;
                    break;
                case "RARE":
                    rarity = 2;
                    break;
                case "EPIC":
                    rarity = 3;
                    break;
                case "LEGENDARY":
                    rarity = 4;
                    break;
                case "MYTHIC":
                    rarity = 5;
                    break;
            };
            line = 'PANDORA';
        } else {
            if (!(name in taliData)) {
                console.log('Found unknown talisman: ' + name);
                return;
            }
            rarity = taliData[name].rarity;
            line = taliData[name].line;
            //check for recombs
            if (talisman?.tag?.value?.ExtraAttributes?.value?.rarity_upgrades?.value === 1 && taliData[name]?.recomb !== false)
                rarity++;
            if (name === 'TRAPPER_CREST' && talisman?.tag?.value?.ExtraAttributes?.value?.pelts_earned?.value >= 500)
                rarity++;
            if (name === 'POWER_ARTIFACT') {
                let gems = talisman?.tag?.value?.ExtraAttributes?.value?.gems?.value;
                let isPerfect = (gem) => gems?.[gem]?.value === "PERFECT" || gems?.[gem]?.value?.quality?.value === "PERFECT";
                if (isPerfect("RUBY_0") && isPerfect("JADE_0") && isPerfect("JASPER_0") && isPerfect("AMBER_0") && isPerfect("SAPPHIRE_0") && isPerfect("TOPAZ_0") && isPerfect("AMETHYST_0"))
                    rarity++;
            }
            if (name === 'PULSE_RING') {
                let charges = talisman?.tag?.value?.ExtraAttributes?.value?.thunder_charge?.value || 0;
                if (charges >= 150000) rarity++;
                if (charges >= 1000000) rarity++;
                if (charges >= 5000000) rarity++;
            }
            if (name === 'BOOK_OF_PROGRESSION') {
                let level = profile?.leveling?.experience || 0;
                if (level >= 75_00) rarity++;
                if (level >= 150_00) rarity++;
                if (level >= 225_00) rarity++;
                if (level >= 300_00) rarity++;
                if (level >= 400_00) rarity++;
                console.log(rarity + " " + level)
            }
        }
        if (!(line in talismanObj)) {
            talismanObj[line] = rarity;
        } else if (rarity > talismanObj[line]) {
            talismanObj[line] = rarity;
        }
    });
    if (profile?.rift?.access?.consumed_prism && !('RIFT_PRISM' in talismanObj))
        value += 11;
    let rarities = {}
    for (let rarity of Object.values(talismanObj)) {
        rarities[rarity] = (rarities[rarity] || 0) + 1;
    }

    Object.entries(talismanObj).forEach(([line, rarity]) => {
        let magicPower = 0;
        switch (rarity) {
            case 0:
                magicPower = 3;
                break;
            case 1:
                magicPower = 5;
                break;
            case 2:
                magicPower = 8;
                break;
            case 3:
                magicPower = 12;
                break;
            case 4:
                magicPower = 16;
                break;
            case 5:
                magicPower = 22;
                break;
        }
        if (line === 'HEGE') magicPower *= 2;
        value += magicPower;
        if (line === 'ABICASE') {
            value += ~~(profile?.nether_island_player_data?.abiphone?.active_contacts?.length / 2) || 0;
        }
    });
    return value;
}

let getSlayerLvl = (xp, type) => {
    return xp >= 1000000
        ? 9
        : xp >= 400000
            ? 8
            : xp >= 100000
                ? 7
                : xp >= 20000
                    ? 6
                    : xp >= 5000
                        ? 5
                        : (type == "eman" && xp >= 1500) || (type != "eman" && xp >= 1000)
                            ? 4
                            : (type == "eman" && xp >= 250) || (type != "eman" && xp >= 200)
                                ? 3
                                : (type == "eman" && xp >= 30) ||
                                    (type == "spider" && xp >= 25) ||
                                    (type != "eman" && type != "spider" && xp >= 20)
                                    ? 2
                                    : (type == "eman" && xp >= 10) || (type != "eman" && xp >= 5)
                                        ? 1
                                        : 0;
};

function fixFarmingNames(name) {
    switch (name) {
        case "INK_SACK:3":
            return "cocoa beans";
        case "POTATO_ITEM":
            return "potato";
        case "CARROT_ITEM":
            return "carrot";
        case "CACTUS":
            return "cactus";
        case "SUGAR_CANE":
            return "sugar cane";
        case "MUSHROOM_COLLECTION":
            return "mushroom";
        case "PUMPKIN":
            return "pumpkin";
        case "NETHER_STALK":
            return "nether wart";
        case "WHEAT":
            return "wheat";
        case "MELON":
            return "melon";
        default:
            return "weed";
    }
}

async function getGexpPos(page, index, array) {
    let i = (page - 1) * 5 + index;
    return array.length > i
        ? `#${i + 1}: ${await getUsernameFromUUID(array[i].name)} (${dot(
            array[i].gexp
        )})`
        : "";
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function findCompletedRuns(data) {
    let total = 0;
    for (let mode in data.dungeon_types) {
        for (let floor in data.dungeon_types[mode].tier_completions) {
            total += data.dungeon_types[mode].tier_completions[floor];
        }
    }
    return total;
}

function findTotalRuns(data) {
    let total = 0;
    for (let floor in data.dungeon_types.catacombs.times_played) {
        total += data.dungeon_types.catacombs.times_played[floor];
    }
    return total;
}

function dungeonTime(time) {
    let seconds = parseInt(time / 1000);
    return (
        "" +
        parseInt(seconds / 60) +
        ":" +
        (seconds % 60 < 10 ? "0" + (seconds % 60) : seconds % 60)
    );
}

async function getPlayerUUID(name) {
    if (name == "" || name == null) return;
    // get player uuid from mojang api
    let response = await fetch(
        `https://api.mojang.com/users/profiles/minecraft/${name}`
    );
    if (response.status != 200) {
        switch (response.status) {
            case 204:
                console.log(`Player ${name} does not exist`);
                break;
            default:
                console.log("Unknown error: " + response.status);
        }
        return;
    }
    let data = await response.json();
    return { uuid: data.id, name: data.name };
}

function findSA60(player, uncapped) {
    let mining = findSkillLevel(player?.experience_skill_mining, false, uncapped);
    let fishing = findSkillLevel(player?.experience_skill_fishing, false, uncapped);
    let farming = findSkillLevel(player?.experience_skill_farming, false, uncapped);
    let taming = findSkillLevel(player?.experience_skill_taming, false, uncapped);
    let foraging = findSkillLevel(player?.experience_skill_foraging, false, uncapped);
    let enchanting = findSkillLevel(player?.experience_skill_enchanting, false, uncapped);
    let alchemy = findSkillLevel(player?.experience_skill_alchemy, false, uncapped);
    let combat = findSkillLevel(player?.experience_skill_combat, false, uncapped);
    let skillSum = mining + fishing + farming + taming + foraging + enchanting + alchemy + combat;
    return skillSum / 8;
}

function findSA(player) {
    let mining = findSkillLevel(player?.experience_skill_mining);
    let fishing = Math.min(50, findSkillLevel(player?.experience_skill_fishing));
    let farming = findSkillLevel(player?.experience_skill_farming);
    let taming = Math.min(50, findSkillLevel(player?.experience_skill_taming));
    let foraging = Math.min(50, findSkillLevel(player?.experience_skill_foraging));
    let enchanting = findSkillLevel(player?.experience_skill_enchanting);
    let alchemy = Math.min(50, findSkillLevel(player?.experience_skill_alchemy));
    let combat = findSkillLevel(player?.experience_skill_combat);
    let skillSum = mining + fishing + farming + taming + foraging + enchanting + alchemy + combat;
    return skillSum / 8;
}

function findSkillLevel(xp, capAt50 = false, uncapped = false) {
    if (!xp) return 0;
    let skillLevel = 0;
    let remainingSkillXp = xp;
    let requiredSkillXp = [
        50, 125, 200, 300, 500, 750, 1000, 1500, 2000, 3500, //1-10
        5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 200000, //11-20
        300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, //21-30
        1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000, //31-40
        2300000, 2400000, 2500000, 2600000, 2750000, 2900000, 3100000, 3400000, 3700000, 4000000, //41-50
        4300000, 4600000, 4900000, 5200000, 5500000, 5800000, 6100000, 6400000, 6700000, 7000000, //51-60
    ];
    for (let skillXp of requiredSkillXp) {
        if (remainingSkillXp > skillXp) {
            skillLevel++;
            remainingSkillXp -= skillXp;
        } else {
            skillLevel += remainingSkillXp / skillXp;
            if (capAt50) return Math.min(50, skillLevel);
            return skillLevel;
        }
    }
    if (uncapped) {
        let skillXp = 7400000;
        let lastIncrease = 400000;
        while (remainingSkillXp > skillXp) {
            remainingSkillXp -= skillXp;
            lastIncrease += 100000;
            skillXp += lastIncrease;
            skillLevel++;
        }
        skillLevel += remainingSkillXp / skillXp;
    }
    if (capAt50) return Math.min(50, skillLevel);
    return skillLevel;
}
function findSocialLevel(xp) {
    if (!xp) return 0;
    let skillLevel = 0;
    let remainingSkillXp = xp;
    let requiredSkillXp = [50, 100, 150, 250, 500, 750, 1000, 1250, 1500, 2000,
        2500, 3000, 3750, 4500, 6000, 8000, 10000, 12500, 15000, 20000,
        25000, 30000, 35000, 40000, 50000]
    for (let skillXp of requiredSkillXp) {
        if (remainingSkillXp > skillXp) {
            skillLevel++;
            remainingSkillXp -= skillXp;
        } else {
            skillLevel += remainingSkillXp / skillXp;
            return skillLevel;
        }
    }
    return skillLevel;
}

function findRunecraftingLevel(xp) {
    if (!xp) return 0;
    let skillLevel = 0;
    let remainingSkillXp = xp;
    let requiredSkillXp = [
        50, 100, 125, 160, 200, 250, 315, 400, 500, 625, //1-10
        785, 1000, 1250, 1565, 2000, 2500, 3125, 4000, 5000, 6250, //11-20
        7850, 9800, 12250, 15300, 19100
    ];
    for (let skillXp of requiredSkillXp) {
        if (remainingSkillXp > skillXp) {
            skillLevel++;
            remainingSkillXp -= skillXp;
        } else {
            skillLevel += remainingSkillXp / skillXp;
            return skillLevel;
        }
    }
    return skillLevel;
}

function findCataLvl(xp, past50 = true) {
    if (!xp || isNaN(xp)) return 0;
    const cataXpTable = [
        50, 75, 110, 160, 230, 330, 470, 670, 950, 1340, 1890, 2665, 3760, 5260, 7380, 10300, 14400, 20000, 27600, 38000, 52500, 71500, 97000, 132000, 180000, 243000, 328000, 445000,
        600000, 800000, 1065000, 1410000, 1900000, 2500000, 3300000, 4300000, 5600000, 7200000, 9200000, 12000000, 15000000, 19000000, 24000000, 30000000, 38000000, 48000000, 60000000, 75000000, 93000000, 116250000
    ]
    let remainingXp = xp;
    let level = 0;

    //levels 1 - 50
    for (let levelXp of cataXpTable) {
        if (levelXp <= remainingXp) {
            remainingXp -= levelXp;
            level++;
        } else {
            level += remainingXp / parseFloat(levelXp);
            return level;
        }
    }
    if (!past50) return level;
    //levels above 50
    level += parseInt(remainingXp / 200000000);
    remainingXp %= 200000000;
    level += remainingXp / 200000000.0;
    return level
}

async function getPlayerStatus(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;
    response = await getJsonFromUrl(
        `https://api.hypixel.net/status?key=${apiKey}&uuid=${uuid}`
    );
    if (response == null || !("success" in response) || !response.success) {
        console.log("Player has no data");
        return;
    }
    response.username = uuidInfo.name;
    return response;
}

async function getPlayerFriends(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;
    response = await getJsonFromUrl(
        `https://api.hypixel.net/friends?key=${apiKey}&uuid=${uuid}`
    );
    if (response == null || !("success" in response) || !response.success) {
        console.log("Player has no data");
        return;
    }
    response.username = uuidInfo.name;
    return response;
}

async function getLilyWeight(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;
    response = await getJsonFromUrl(
        `https://lily.antonio32a.com/${uuid}?key=${apiKey}`
    );
    if (response == null || !("success" in response) || !response.success) {
        console.log("Error catching lily weight");
        return;
    }
    response.username = uuidInfo.name;
    return response;
}

async function getPlayerStatsHypixel(name) {
    response = await getJsonFromUrl(
        `https://api.hypixel.net/player?key=${apiKey}&name=${name}`
    );
    if (
        response == null ||
        !("success" in response) ||
        !response.success ||
        !("player" in response)
    ) {
        console.log("Player has no data");
        return;
    }
    return response.player;
}

async function getGuildData(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;
    response = await getJsonFromUrl(
        `https://api.hypixel.net/guild?key=${apiKey}&player=${uuid}`
    );
    response.username = uuidInfo.name;
    response.uuid = uuidInfo.uuid;
    return response;
}

async function getGuildByGuildName(name) {
    response = await getJsonFromUrl(
        `https://api.hypixel.net/guild?key=${apiKey}&name=${name}`
    );
    return response;
}

async function getAuctionInfo(name) {
    let playerInfo = await getPlayerHypixelFullProfile(name);
    let profileId = playerInfo.profile_id;
    response = await getJsonFromUrl(
        `https://api.hypixel.net/skyblock/auction?key=${apiKey}&profile=${profileId}`
    );
    if (
        response == null ||
        !("success" in response) ||
        !response.success ||
        !("auctions" in response)
    ) {
        console.log("Player has no auction data");
        return;
    }
    response.username = playerInfo.username;
    response.uuid = playerInfo.uuid;
    return response;
}

async function getPlayerHypixel(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;

    response = await getJsonFromUrl(
        `https://api.hypixel.net/skyblock/profiles?uuid=${uuid}&key=${apiKey}`
    );

    if (
        response == null ||
        !("success" in response) ||
        !response.success ||
        !("profiles" in response)
    ) {
        console.log("Player has no skyblock data");
        return;
    }
    //find latest profile
    let currentProfile = {};
    Object.values(response?.profiles || {}).forEach(profile => {
        if (profile.selected) {
            currentProfile = profile.members[uuid];
        }
    })
    currentProfile.username = uuidInfo.name;
    return currentProfile;
}

async function getPlayerHypixelFullProfile(name) {
    let uuidInfo = await getPlayerUUID(name);
    if (uuidInfo == null || uuidInfo.uuid == null) return;
    let uuid = uuidInfo.uuid;

    response = await getJsonFromUrl(
        `https://api.hypixel.net/skyblock/profiles?uuid=${uuid}&key=${apiKey}`
    );

    if (
        response == null ||
        !("success" in response) ||
        !response.success ||
        !("profiles" in response)
    ) {
        console.log("Player has no skyblock data");
        return;
    }
    //find latest profile
    let currentProfile = {};
    for (let i in response.profiles) {
        let profile = response.profiles[i];
        if (profile.selected) {

            currentProfile = profile;
        }
    }
    currentProfile.username = uuidInfo.name;
    currentProfile.uuid = uuidInfo.uuid;
    return currentProfile;
}

//format numbers
function dot(number) {
    if (isNaN(number)) return 0;
    return String(parseInt(number)).replace(/\d(?=(?:\d{3})+$)/g, "$&,");
}
//space
function space(number) {
    if (isNaN(number)) return 0;
    return String(parseInt(number)).replace(/\d(?=(?:\d{3})+$)/g, "$& ");
}

function shortenDot(number) {
    let intPart = String(parseInt(number));
    let decimals = String(parseFloat(number).toFixed(2));
    return dot(intPart) + "." + decimals.substr(decimals.length - 2);
}

//senither api wants dashes in uuids so we manually add them
function hyphenateUUID(uuid) {
    if (uuid == null) return;
    if (uuid.length == 36) return uuid;
    return (
        uuid.substring(0, 8) +
        "-" +
        uuid.substring(8, 12) +
        "-" +
        uuid.substring(12, 16) +
        "-" +
        uuid.substring(16, 20) +
        "-" +
        uuid.substring(20, 32)
    );
}

async function getKeyword(word) {
    const response = await fetch("https://sky.shiiyu.moe/api/v2/leaderboards");
    const jsondata = await response.json();
    let bestMatch = null;
    // fix for guild members being unable to understand how stuff works
    if (word.toLowerCase() == "eman") word = "ender-xp";
    let words = word.split("-");
    for (const lbkey in jsondata) {
        let stat = jsondata[lbkey];
        if (containsAll(words, stat.key) || containsAll(words, stat.name)) {
            if (bestMatch == null || bestMatch.key.length > stat.key.length)
                bestMatch = { key: stat.key, name: stat.name };
        }
    }
    return bestMatch;
}

function containsAll(array, word) {
    for (let s in array) {
        if (!word.toLowerCase().includes(array[s].toLowerCase())) {
            return false;
        }
    }
    return true;
}

async function getLeaderboard(message) {
    let arguments = message.split(" ");
    if (arguments.length < 3) return;
    let lb = arguments[2];
    //weight leaderboard comes from a different source
    if (/(weight)|(we)/.test(lb)) {
        let page = 1;
        let guildId = "";
        if (arguments.length > 3) {
            if (!isNaN(arguments[3])) {
                Math.max((page = arguments[3]));
            } else {
                if (arguments.length > 4 && !isNaN(arguments[4])) {
                    page = Math.max(arguments[4]);
                }
                let guildData = await getGuildData(arguments[3]);
                if (guildData == null) return;
                guildId = guildData.guild._id;
            }
        }
        let lbData = await getJsonFromUrl(
            `https://hypixel-app-api.senither.com/leaderboard/players/${guildId}`
        );
        let sorted = lbData.data.sort((a, b) => b.weight - a.weight);
        let result = "";
        for (let i = (page - 1) * 5; i < page * 5; i++) {
            if (i < sorted.length)
                result += `#${i + 1}: ${sorted[i].username} (${shortenDot(
                    sorted[i].weight
                )}) `;
        }
        return result;
    } else {
        rs = await getKeyword(lb);
    }
    if (rs == null) {
        console.log("no leaderboard found");
        return;
    }
    let url = `https://sky.shiiyu.moe/api/v2/leaderboard/${rs.key}?count=5`;
    let n = 0;
    if (arguments.length > 3) {
        if (!isNaN(arguments[3])) {
            url += `&page=${arguments[3]}`;
            n = arguments[3] - 1;
        } else {
            url += `&guild=${arguments[3]}`;
            if (arguments.length > 4 && !isNaN(arguments[4])) {
                url += `&page=${arguments[4]}`;
                n = arguments[4] - 1;
            } else {
                url += "&page=1";
            }
        }
    }
    const response = await fetch(url);
    if (response.status != 200) {
        console.log("error fetching leaderboard");
        return;
    }
    const jsondata = await response.json();
    if ("error" in jsondata) {
        console.log(jsondata.error);
        return;
    }
    return `${rs.name}: ${getPos(jsondata, 0, n)} ${getPos(
        jsondata,
        1,
        n
    )} ${getPos(jsondata, 2, n)} ${getPos(jsondata, 3, n)} ${getPos(
        jsondata,
        4,
        n
    )}`;
}

function getPos(object, i, n) {
    return i in object.positions
        ? `#${5 * n + i + 1}: ${object.positions[i].username} (${object.positions[i].amount
        })`
        : "";
}

function getTimeString(time) {
    let totalSeconds = parseInt(time / 1000);
    let totalMinutes = parseInt(totalSeconds / 60);
    let totalHours = parseInt(totalMinutes / 60);
    let totalDays = parseInt(totalHours / 24);
    return (
        (totalDays > 0 ? `${totalDays}d ` : "") +
        (totalHours > 0 ? `${totalHours - totalDays * 24}h ` : "") +
        (totalMinutes > 0 ? `${totalMinutes - 60 * totalHours}m ` : "") +
        (totalSeconds > 0 ? `${totalSeconds - totalMinutes * 60}s ` : "")
    );
}

async function getUsernameFromUUID(uuid) {
    let response = await fetch(
        `https://api.mojang.com/user/profiles/${uuid}/names`
    );
    let data = await response.json();
    if (data.length == 1) {
        return data[0].name;
    } else {
        let currentName = null;
        for (let i in data) {
            let name = data[i];
            if (!("changedToAt" in name) && currentName == null) {
                currentName = { name: name.name, changedToAt: 0 };
            } else if (currentName == null) {
                currentName = name;
            } else if (name.changedToAt > currentName.changedToAt) {
                currentName = name;
            }
        }
        return currentName.name;
    }
}

async function getJsonFromUrl(url) {
    //wipe old cache entries
    for (let i in cache) {
        if (cache[i].lastUpdate < Date.now() - refreshTime) delete cache[i];
    }
    //check if url is still in cache
    if (url in cache) return cache[url].data;

    //prevent api key death
    if (remainingRequests < 10) {
        //sleep till refresh time
        await new Promise((resolve) => setTimeout(resolve, timeTillReset * 1000));
    }

    let response = await fetch(url);
    if (url.includes("senither") || url.includes("hypixel")) {
        remainingRequests = response.headers.get("ratelimit-remaining");
        timeTillReset = response.headers.get("ratelimit-reset");
    }
    if (response.status != 200) {
        switch (response.status) {
            case 403:
                console.log("API key is invalid, requesting a new one");
                break;
            case 429:
                console.log("API rate limit reached");
                break;
            case 500:
                console.log("Internal API error");
                break;
            case 502:
                console.log("API not available");
                break;
            case 503:
                console.log("API in maintenance mode");
                break;
            default:
                console.log("Unknown error requesting url");
        }
        return;
    }
    let jsonData = await response.json();

    //update cache
    cache[url] = { lastUpdate: Date.now(), data: jsonData };
    return jsonData;
}

function getDungeonWeight(player) {
    let cata = player?.dungeons?.dungeon_types?.catacombs?.experience ?? 0;
    let healer = player?.dungeons?.player_classes?.healer?.experience ?? 0;
    let mage = player?.dungeons?.player_classes?.mage?.experience ?? 0;
    let archer = player?.dungeons?.player_classes?.archer?.experience ?? 0;
    let berserk = player?.dungeons?.player_classes?.berserk?.experience ?? 0;
    let tank = player?.dungeons?.player_classes?.tank?.experience ?? 0;
    const level50experience = 569809640;
    const weights = {
        catacombs: 0.0002149604615,
        healer: 0.0000045254834,
        mage: 0.0000045254834,
        berserker: 0.0000045254834,
        archer: 0.0000045254834,
        tank: 0.0000045254834,
    }
    let we = (xp, modifier) => {
        let base = Math.pow(findCataLvl(xp, false), 4.5) * modifier;
        if (xp < level50experience) {
            return [base, 0]
        }
        let remaining = xp - level50experience;
        let splitter = (4 * level50experience) / base;
        return [Math.floor(base), Math.pow(remaining / splitter, 0.968)];
    }
    return [we(cata, weights.catacombs), we(healer, weights.healer), we(archer, weights.archer), we(berserk, weights.berserker), we(mage, weights.mage), we(tank, weights.tank)];
}

function getSkillWeight(player) {
    let combat = player?.experience_skill_combat ?? 0;
    let foraging = player?.experience_skill_foraging ?? 0;
    let farming = player?.experience_skill_farming ?? 0;
    let fishing = player?.experience_skill_fishing ?? 0;
    let enchanting = player?.experience_skill_enchanting ?? 0;
    let alchemy = player?.experience_skill_alchemy ?? 0;
    let taming = player?.experience_skill_taming ?? 0;
    let mining = player?.experience_skill_mining ?? 0;

    const weights = {
        // Maxes out mining at 1,750 points at 60.
        mining: {
            exponent: 1.18207448,
            divider: 259634,
            maxXp: 111672425,
        },
        // Maxes out foraging at 850 points at level 50.
        foraging: {
            exponent: 1.232826,
            divider: 259634,
            maxXp: 55172425,
        },
        // Maxes out enchanting at 450 points at level 60.
        enchanting: {
            exponent: 0.96976583,
            divider: 882758,
            maxXp: 111672425,
        },
        // Maxes out farming at 2,200 points at level 60.
        farming: {
            exponent: 1.217848139,
            divider: 220689,
            maxXp: 111672425,
        },
        // Maxes out combat at 1,500 points at level 60.
        combat: {
            exponent: 1.15797687265,
            divider: 275862,
            maxXp: 111672425,
        },
        // Maxes out fishing at 2,500 points at level 50.
        fishing: {
            exponent: 1.406418,
            divider: 88274,
            maxXp: 55172425,
        },
        // Maxes out alchemy at 200 points at level 50.
        alchemy: {
            exponent: 1.0,
            divider: 1103448,
            maxXp: 55172425,
        },
        // Maxes out taming at 500 points at level 50.
        taming: {
            exponent: 1.14744,
            divider: 441379,
            maxXp: 55172425,
        },
    }
    let we = (xp, weight) => {
        let level = findSkillLevel(xp, weight.maxXp == 55172425, false)
        let base = Math.pow(level * 10, 0.5 + weight.exponent + level / 100) / 1250
        if (xp > weight.maxXp) {
            base = Math.round(base)
        }
        if (xp <= weight.maxXp) {
            return [base, 0]
        }
        let ov = Math.pow((xp - weight.maxXp) / weight.divider, 0.968);
        return [base, ov]
    }

    return [we(combat, weights.combat), we(foraging, weights.foraging), we(farming, weights.farming),
    we(fishing, weights.fishing), we(enchanting, weights.enchanting), we(alchemy, weights.alchemy), we(taming, weights.taming), we(mining, weights.mining)]
}

function getSlayerWeight(player) {
    let rev = player?.slayer_bosses?.zombie?.xp ?? 0;
    let tara = player?.slayer_bosses?.spider?.xp ?? 0;
    let sven = player?.slayer_bosses?.wolf?.xp ?? 0;
    let eman = player?.slayer_bosses?.enderman?.xp ?? 0;

    const weights = {
        revenant: {
            divider: 2208,
            modifier: 0.15,
        },
        tarantula: {
            divider: 2118,
            modifier: 0.08,
        },
        sven: {
            divider: 1962,
            modifier: 0.015,
        },
        enderman: {
            divider: 1430,
            modifier: .017,
        }
    }
    let we = (xp, weight) => {
        if (xp < 1000000)
            return [xp / weight.divider, 0];
        let base = 1000000 / weight.divider;
        let remaining = xp - 1000000;
        let modifier = weight.modifier;
        let overflow = 0;
        while (remaining > 0) {
            let left = Math.min(remaining, 1000000);

            overflow += Math.pow(left / (weight.divider * (1.5 + modifier)), 0.942);
            modifier += weight.modifier;
            remaining -= left;
        }
        return [base, overflow]
    }

    return [we(rev, weights.revenant), we(tara, weights.tarantula), we(sven, weights.sven), we(eman, weights.enderman)]
}

// getInfoText('pb-f7', 'clfford', 'whatever').then(res => console.log(res)).catch(err => console.log(err));

//module.exports.StatChecker = StatChecker;
module.exports.getInfoText = getInfoText;
module.exports.getLeaderboard = getLeaderboard;
