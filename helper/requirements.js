const { MessageEmbed } = require('discord.js');
const config = require('../config.json');
const { hypixelRequest, hypixelLevel, addCommas, toFixed } = require('./functions.js');
const { getBedwarsLevel } = require('./getBedwarsLevel');
const { getSkillAverage, getSkillLevel } = require('./skills');
const { getSenitherWeight, getLilyWeight } = require('./weight');
const { getNetworth } = require('skyhelper-networth');

const LONG_STATS = {
    skyblockLevel: 'SkyBlock Level',
    networth: 'Networth',
    lilyWeight: 'Lily Weight',
    senitherWeight: 'Senither Weight',
    skillAverage: 'Skill Average',
    hypixelLevel: 'Hypixel Level',
    catacombs: 'Catacombs',
    slayer: 'Slayer',
    bwLevel: 'Bedwars Stars',
    bwFKDR: 'Bedwars FKDR',
};

async function getRequirements(uuid) {
    const configReqs = config.guildRequirement?.requirements;
    const result = {
        skyblockLevel: null,
        networth: null,
        senitherWeight: null,
        lilyWeight: null,
        skillAverage: null,
        catacombs: null,
        slayer: {
            revenant: null,
            tarantula: null,
            wolf: null,
            enderman: null,
            blaze: null,
        },
        hypixelLevel: null,
        bwLevel: null,
        bwFKDR: null,
    };

    const sbData = await hypixelRequest(`https://api.hypixel.net/skyblock/profiles?uuid=${uuid}`, true);
    if ((sbData?.profiles?.length || 0) > 0) {
        for (const profile of sbData.profiles) {
            const memberData = profile?.members?.[uuid] || {};
            const skyblockLevel = Number(toFixed((memberData.leveling?.experience || 0) / 100, 2));
            let networth = 0;
            try {
                networth = (await getNetworth(memberData, profile?.banking?.balance || 0, { onlyNetworth: true })).networth;
            } catch (e) {}
            let senitherWeight = getSenitherWeight(memberData);
            senitherWeight = senitherWeight.total + senitherWeight.totalOverflow;
            const lilyWeight = getLilyWeight(memberData).total;
            const skillAverage = getSkillAverage(memberData);
            const catacombs = getSkillLevel(memberData.dungeons?.dungeon_types?.catacombs?.experience || 0, { skill: 'dungeoneering' });
            const revenant = getSkillLevel(memberData?.slayer_bosses?.zombie?.xp || 0, { skill: 'slayer' });
            const tarantula = getSkillLevel(memberData?.slayer_bosses?.spider?.xp || 0, { skill: 'slayer' });
            const wolf = getSkillLevel(memberData?.slayer_bosses?.wolf?.xp || 0, { skill: 'slayer' });
            const enderman = getSkillLevel(memberData?.slayer_bosses?.enderman?.xp || 0, { skill: 'slayer' });
            const blaze = getSkillLevel(memberData?.slayer_bosses?.blaze?.xp || 0, { skill: 'slayer' });

            if ((result.skyblockLevel || 0) < skyblockLevel) result.skyblockLevel = skyblockLevel;
            if ((result.networth || 0) < networth) result.networth = networth;
            if ((result.senitherWeight || 0) < senitherWeight) result.senitherWeight = senitherWeight;
            if ((result.lilyWeight || 0) < lilyWeight) result.lilyWeight = lilyWeight;
            if ((result.skillAverage || 0) < skillAverage) result.skillAverage = skillAverage;
            if ((result.catacombs || 0) < catacombs) result.catacombs = catacombs;
            if ((result.slayer.revenant || 0) < revenant) result.slayer.revenant = revenant;
            if ((result.slayer.tarantula || 0) < tarantula) result.slayer.tarantula = tarantula;
            if ((result.slayer.wolf || 0) < wolf) result.slayer.wolf = wolf;
            if ((result.slayer.enderman || 0) < enderman) result.slayer.enderman = enderman;
            if ((result.slayer.blaze || 0) < blaze) result.slayer.blaze = blaze;
        }
    }

    if (configReqs?.hypixelLevel || configReqs?.bwLevel || configReqs?.bwFKDR) {
        const playerRes = await hypixelRequest(`https://api.hypixel.net/player?uuid=${uuid}`, true);
        if (playerRes?.player) {
            if (configReqs?.hypixelLevel) {
                result.hypixelLevel = hypixelLevel(playerRes.player.networkExp || 0);
            }

            const achievements = playerRes.player.achievements;
            const skills = [
                achievements?.skyblock_harvester || 0,
                achievements?.skyblock_excavator || 0,
                achievements?.skyblock_combat || 0,
                achievements?.skyblock_gatherer || 0,
                achievements?.skyblock_angler || 0,
                achievements?.skyblock_augmentation || 0,
                achievements?.skyblock_concoctor || 0,
                achievements?.skyblock_domesticator || 0,
            ];
            const skillAverage = skills.reduce((a, b) => a + b, 0) / skills.length;
            if (result.skillAverage < skillAverage) {
                result.skillAverage = skillAverage;
            }

            const bwStats = playerRes?.player?.stats?.Bedwars;
            if (configReqs?.bwLevel) {
                result.bwLevel = getBedwarsLevel(bwStats?.Experience || 0);
            }

            if (configReqs?.bwFKDR) {
                result.bwFKDR = Number((bwStats?.final_kills_bedwars / bwStats?.final_deaths_bedwars).toFixed(2));
            }
        } else {
            result.hypixelLevel = null;
        }
    }

    return result;
}

function getRequirementEmbed(requirementData, username, officerChatMessage, uuid) {
    let requirementsMet = 0;
    let requirementsMetSkyblock = 0;
    let requirementsMetBedwars = 0;
    const requirementsEmbed = new MessageEmbed().setTitle(`${username}'s Requirements`).setColor('BLURPLE');

    let requirementsDescription = [];
    for (const [stat, requirement] of Object.entries(config.guildRequirement.requirements)) {
        if (requirement instanceof Object && stat === 'slayer') {
            let slayerRequirementsMet = 0;
            const slayerDescription = [];
            for (const [slayerType, slayerLevel] of Object.entries(requirement)) {
                if ((requirementData.slayer[slayerType] || 0) >= slayerLevel) {
                    slayerRequirementsMet++;
                }
                slayerDescription.push(requirementData.slayer[slayerType] || 0);
            }
            if (slayerRequirementsMet >= Object.keys(requirement).length) {
                requirementsMet++;
                requirementsMetSkyblock++;
            }
            requirementsDescription.push(
                `**Slayer**: \`${slayerDescription.join('/')}\` ${slayerRequirementsMet >= Object.keys(requirement).length ? '✅' : '⛔'}`
            );
        } else {
            if (requirementData[stat] >= requirement) {
                requirementsMet++;
                if (!stat.includes('bw')) requirementsMetSkyblock++;
                else requirementsMetBedwars++;
                requirementsDescription.push(`**${LONG_STATS[stat]}**: \`${addCommas(requirementData[stat]?.toFixed())}\` ✅`);
            } else {
                requirementsDescription.push(`**${LONG_STATS[stat]}**: \`${addCommas(requirementData[stat]?.toFixed())}\` ⛔`);
            }
        }
    }
    let totalBwStats = 0;
    for (const stat of Object.keys(config.guildRequirement.requirements)) {
        if (stat.includes('bw')) {
            totalBwStats++;
        }
    }
    if (config.guildRequirement.autoAccept) {
        const blacklist = (config.guildRequirement.autoAcceptBlacklist || []).map((b) => b.toLowerCase());
        const isBlacklisted = blacklist.includes(username.toLowerCase()) || blacklist.includes(uuid.toLowerCase());
        requirementsDescription.unshift('');
        if (
            requirementsMet >= (config.guildRequirement.minRequired || Object.keys(config.guildRequirement.requirements).length) ||
            (config.guildRequirement.acceptEitherSkyblockOrBedwars &&
                (requirementsMetBedwars >= totalBwStats ||
                    requirementsMetSkyblock >= Object.keys(config.guildRequirement.requirements).length - totalBwStats))
        ) {
            if (officerChatMessage) {
                if (isBlacklisted) requirementsDescription.unshift(`**${username}** has met the requirements but is blacklisted!`);
                else requirementsDescription.unshift(`**${username}** has met the requirements and automatically got accepted!`);
            } else {
                if (isBlacklisted) requirementsDescription.unshift(`**${username}** meets the requirements but is blacklisted!`);
                else requirementsDescription.unshift(`**${username}** meets the requirements and is allowed to join the guild!`);
            }
            requirementsEmbed.setColor('GREEN');
        } else {
            if (isBlacklisted) requirementsDescription.unshift(`**${username}** does not meet the requirements and is blacklisted!`);
            else requirementsDescription.unshift(`**${username}** does not meet the requirements and is not allowed to join the guild.`);
            requirementsEmbed.setColor('RED');
        }
    }
    requirementsEmbed.setDescription(requirementsDescription.join('\n'));

    return requirementsEmbed;
}

module.exports = {
    getRequirements,
    getRequirementEmbed,
    LONG_STATS,
};
