const { MessageEmbed } = require('discord.js');
const config = require('../config.json');
const { hypixelRequest, hypixelLevel, addCommas } = require('./functions.js');
const { getSkillAverage, getSkillLevel } = require('./skills');
const { getSenitherWeight, getLilyWeight } = require('./weight');

const LONG_STATS = {
    lilyWeight: 'Lily Weight',
    senitherWeight: 'Senither Weight',
    skillAverage: 'Skill Average',
    hypixelLevel: 'Hypixel Level',
    catacombs: 'Catacombs',
    slayer: 'Slayer',
};

async function getRequirements(uuid) {
    const result = {
        senitherWeight: null,
        lilyWeight: null,
        hypixelLevel: null,
        skillAverage: null,
        catacombs: null,
        slayer: {
            revenant: null,
            tarantula: null,
            wolf: null,
            enderman: null,
            blaze: null,
        },
    };

    const sbData = await hypixelRequest(`https://api.hypixel.net/skyblock/profiles?uuid=${uuid}`, true);
    if ((sbData?.profiles?.length || 0) > 0) {
        for (const profile of sbData.profiles) {
            const memberData = profile?.members?.[uuid] || {};
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

    if (config.guildRequirement?.requirements?.hypixelLevel) {
        const playerRes = await hypixelRequest(`https://api.hypixel.net/player?uuid=${uuid}`, true);
        if (playerRes) {
            result.hypixelLevel = hypixelLevel(playerRes.player.networkExp || 0);
        } else {
            result.hypixelLevel = null;
        }
    }

    return result;
}

function getRequirementEmbed(requirementData, username, officerChatMessage) {
    let requirementsMet = 0;
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
            }
            requirementsDescription.push(
                `**Slayer**: \`${slayerDescription.join('/')}\` ${slayerRequirementsMet >= Object.keys(requirement).length ? '✅' : '⛔'}`
            );
        } else {
            if (requirementData[stat] >= requirement) {
                requirementsMet++;
                requirementsDescription.push(`**${LONG_STATS[stat]}**: \`${addCommas(requirementData[stat]?.toFixed())}\` ✅`);
            } else {
                requirementsDescription.push(`**${LONG_STATS[stat]}**: \`${addCommas(requirementData[stat]?.toFixed())}\` ⛔`);
            }
        }
    }

    if (config.guildRequirement.autoAccept) {
        requirementsDescription.unshift('');
        if (requirementsMet >= (config.guildRequirement.minRequired || Object.keys(config.guildRequirement.requirements).length)) {
            if (officerChatMessage) {
                requirementsDescription.unshift(`**${username}** has met the requirements and automatically got accepted!`);
            } else {
                requirementsDescription.unshift(`**${username}** meets the requirements and is allowed to join the guild!`);
            }
            requirementsEmbed.setColor('GREEN');
        } else {
            requirementsDescription.unshift(`**${username}** does not meet the requirements and is not allowed to join the guild.`);
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
