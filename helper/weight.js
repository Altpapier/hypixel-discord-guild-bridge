const LilyWeight = require('lilyweight');
const { getSkillLevel } = require('./skills');

const senither = {
    dungeonWeights: {
        catacombs: 0.0002149604615,
        healer: 0.0000045254834,
        mage: 0.0000045254834,
        berserk: 0.0000045254834,
        archer: 0.0000045254834,
        tank: 0.0000045254834,
    },
    slayerWeights: {
        zombie: { divider: 2208, modifier: 0.15 },
        spider: { divider: 2118, modifier: 0.08 },
        wolf: { divider: 1962, modifier: 0.015 },
        enderman: { divider: 1430, modifier: 0.017 },
    },
    skillWeights: {
        mining: { exponent: 1.18207448, divider: 259634, maxLevel: 60 },
        // Maxes out foraging at 850 points at level 50.
        foraging: { exponent: 1.232826, divider: 259634, maxLevel: 50 },
        // Maxes out enchanting at 450 points at level 60.
        enchanting: { exponent: 0.96976583, divider: 882758, maxLevel: 60 },
        // Maxes out farming at 2,200 points at level 60.
        farming: { exponent: 1.217848139, divider: 220689, maxLevel: 60 },
        // Maxes out combat at 1,500 points at level 60.
        combat: { exponent: 1.15797687265, divider: 275862, maxLevel: 60 },
        // Maxes out fishing at 2,500 points at level 50.
        fishing: { exponent: 1.406418, divider: 88274, maxLevel: 50 },
        // Maxes out alchemy at 200 points at level 50.
        alchemy: { exponent: 1.0, divider: 1103448, maxLevel: 50 },
        // Maxes out taming at 500 points at level 50.
        taming: { exponent: 1.14744, divider: 441379, maxLevel: 50 },
    },
};

const slayers = ['zombie', 'spider', 'wolf', 'enderman']; // Order is important for lily weight
const lilySlayers = ['zombie', 'spider', 'wolf', 'enderman', 'blaze'];
const classes = ['healer', 'mage', 'berserk', 'archer', 'tank'];
const skills = ['enchanting', 'taming', 'alchemy', 'mining', 'farming', 'foraging', 'combat', 'fishing']; // Order is important for lily weight

/**
 * Gets senither weight from profile data
 * @param {{}} profileData profile data from API
 * @returns senither weight data
 */
function getSenitherWeight(profileData) {
    const weight = {
        skills: skills.reduce((acc, val) => {
            const xp = profileData[`experience_skill_${val}`] || 0;
            acc[val] = calculateSkillWeight(val, getSkillLevel(xp, { skill: val, decimals: 5 }), xp);
            return acc;
        }, {}),
        slayers: slayers.reduce((acc, val) => {
            acc[val] = calculateSlayerWeight(val, profileData.slayer_bosses?.[val]?.xp || 0);
            return acc;
        }, {}),
        dungeons: {
            catacombs: calculateDungeonWeight(
                'catacombs',
                getSkillLevel(profileData.dungeons?.dungeon_types?.catacombs?.experience, { skill: 'dungeoneering', decimals: 5, manualCap: 50 }),
                profileData.dungeons?.dungeon_types?.catacombs?.experience || 0
            ),
            classes: classes.reduce((acc, val) => {
                const xp = profileData.dungeons?.player_classes?.[val]?.experience || 0;
                acc[val] = calculateDungeonWeight(val, getSkillLevel(xp, { skill: 'dungeonClass', decimals: 5 }), xp);
                return acc;
            }, {}),
        },
    };

    const add = (obj, keys) => {
        return Object.keys(obj).reduce((acc, val) => {
            if (keys.includes(val)) return acc + obj[val];
            else return acc + add(obj[val], keys);
        }, 0);
    };

    weight.total = add(weight, ['weight']);
    weight.totalOverflow = add(weight, ['weightOverflow']);
    weight.skills.weight = add(weight.skills, ['weight']);
    weight.skills.weightOverflow = add(weight.skills, ['weightOverflow']);
    weight.slayers.weight = add(weight.slayers, ['weight']);
    weight.slayers.weightOverflow = add(weight.slayers, ['weightOverflow']);
    weight.dungeons.classes.weight = add(weight.dungeons.classes, ['weight']);
    weight.dungeons.classes.weightOverflow = add(weight.dungeons.classes, ['weightOverflow']);
    weight.dungeons.weight = weight.dungeons.catacombs.weight + weight.dungeons.classes.weight;
    weight.dungeons.weightOverflow = weight.dungeons.catacombs.weightOverflow + weight.dungeons.classes.weightOverflow;

    return weight;
}

function calculateDungeonWeight(type, level, experience) {
    let percentageModifier = senither.dungeonWeights[type];
    let base = Math.pow(level, 4.5) * percentageModifier;
    if (experience <= 569809640) return { weight: base, weightOverflow: 0 };
    let remaining = experience - 569809640;
    let splitter = (4 * 569809640) / base;
    return { weight: Math.floor(base), weightOverflow: Math.pow(remaining / splitter, 0.968) || 0 };
}

function calculateSkillWeight(type, level, experience) {
    const skillGroup = senither.skillWeights[type];
    if (skillGroup.exponent == undefined || skillGroup.divider == undefined) return { weight: 0, weightOverflow: 0 };

    let maxSkillLevelXP = skillGroup.maxLevel == 60 ? 111672425 : 55172425;
    let base = Math.pow(level * 10, 0.5 + skillGroup.exponent + level / 100) / 1250;

    if (experience > maxSkillLevelXP) base = Math.round(base);
    if (experience <= maxSkillLevelXP) return { weight: base, weightOverflow: 0 };
    return { weight: base, weightOverflow: Math.pow((experience - maxSkillLevelXP) / skillGroup.divider, 0.968) };
}

function calculateSlayerWeight(type, experience) {
    const slayerWeight = senither.slayerWeights[type];
    if (experience <= 1000000) {
        return { weight: experience == 0 ? 0 : experience / slayerWeight.divider, weightOverflow: 0 };
    }

    let base = 1000000 / slayerWeight.divider;
    let remaining = experience - 1000000;
    let modifier = slayerWeight.modifier;
    let overflow = 0;

    while (remaining > 0) {
        let left = Math.min(remaining, 1000000);
        overflow += Math.pow(left / (slayerWeight.divider * (1.5 + modifier)), 0.942);
        modifier += slayerWeight.modifier;
        remaining -= left;
    }

    return { weight: base, weightOverflow: overflow };
}

/**
 * Gets lily weight from profile data
 * @param {{}} profileData profile data from API
 * @returns lily weight data
 */
function getLilyWeight(profileData) {
    const catacombsCompletions = profileData.dungeons?.dungeon_types?.catacombs?.tier_completions || {};
    const mmCompletions = profileData.dungeons?.dungeon_types?.master_catacombs?.tier_completions || {};
    const weight = LilyWeight.getWeightRaw(
        skills.map((skill) => getSkillLevel(profileData[`experience_skill_${skill}`], { skill, manualCap: 60 })),
        skills.map((skill) => profileData[`experience_skill_${skill}`] || 0),
        Array.apply(null, Array(8))
            .map((_, i) => catacombsCompletions[i] || 0)
            .reduce((acc, val, i) => {
                acc[i] = val;
                return acc;
            }, {}),
        Array.apply(null, Array(8 - 1))
            .map((_, i) => mmCompletions[i + 1] || 0)
            .reduce((acc, val, i) => {
                acc[i + 1] = val;
                return acc;
            }, {}),
        profileData.dungeons?.dungeon_types?.catacombs?.experience || 0,
        lilySlayers.map((slayer) => profileData.slayer_bosses?.[slayer]?.xp || 0)
    );

    return { ...weight };
}

module.exports = {
    getSenitherWeight,
    getLilyWeight,
};
