const { skillTables } = require('../constants/global.js');

function getTableAndMax(skill, manualCap) {
    const table = ['social', 'runecrafting', 'dungeoneering', 'slayer', 'hotm'].includes(skill)
        ? skill
        : 'dungeonClass' === skill ?
            'dungeoneering'
            : 'default';
    return { table, maxLevel: manualCap || skillTables.maxLevels[skill || 'default'] };
}

/**
 * Converts skill experience to level
 * @param {Number} experience amount of skill experience
 * @param {{skill: String, decimals: Number, manualCap: Number}} data skill name, number of decimals to return, and manual level cap
 * @returns {Number} skill level
 */
function getSkillLevel(experience, { skill, decimals = 0, manualCap } = { decimals: 0 }) {
    if (!experience) return 0;
    const { table, maxLevel } = getTableAndMax(skill, manualCap);
    let level = skillTables[table].filter((exp) => exp <= experience).length - 1;
    if (level >= maxLevel) return maxLevel;

    if (decimals) {
        const nextExp = getNextLevelExperience({ level }, { skill });
        level += (experience - skillTables[table][level]) / nextExp;
        level = Number(level.toFixed(decimals));
    }

    if (level < 0) return 0;
    else return level;
}

/**
 * Calculates the required experience for the next level
 * @param {{level: Number, experience: Number}} skill_experience either skill level or experience
 * @param {{skill: String, manualCap: Number}} data name of the skill and manual level cap
 * @returns {Number} experience for the next level
 */
function getNextLevelExperience({ level, experience }, { skill, manualCap } = {}) {
    const { table, maxLevel } = getTableAndMax(skill, manualCap);
    if (experience > -1 && !level) level = getSkillLevel(experience, { skill });

    if (level >= (manualCap || maxLevel)) return 0;
    return skillTables[table][Math.floor(level) + 1] - (experience || skillTables[table][Math.floor(level)]);
}

/**
 * Calcultes the skill average based on the 8 skills
 * @param {Object} profileData profile data for the player
 * @param {Number} decimals number of decimals to return
 * @returns {Number} skill average
 */
function getSkillAverage(profileData, decimals = 0) {
    const skills = ['farming', 'mining', 'combat', 'foraging', 'fishing', 'enchanting', 'alchemy', 'taming', 'carpentry'];
    const levels = skills.map((skill) => {
        const manualCap =
            skill === 'farming' && profileData.jacob2?.perks.farming_level_cap > -1 ? 50 + profileData.jacob2?.perks.farming_level_cap : null;
        return getSkillLevel(profileData[`experience_skill_${skill}`], { skill, decimals, manualCap });
    });
    const average = levels.reduce((acc, val) => acc + val) / levels.length;

    return Number(average.toFixed(decimals));
}

/**
 * Converts slayer experience to level
 * @param {Number} experience amount of slayer experience
 * @param {{decimals: Number}} data number of decimals to return
 * @returns {Number} slayer level
 */
function getSlayerLevel(experience, { decimals = 0 } = { decimals: 0 }) {
    if (!experience) return 0;
    const { table, maxLevel } = getTableAndMax('slayer');

    let level = skillTables[table].filter((exp) => exp <= experience).length - 1;
    if (level >= maxLevel) return maxLevel;

    if (decimals) {
        const nextExp = getNextLevelExperience({ level }, { skill: 'slayer' });
        level += (experience - skillTables[table][level]) / nextExp;
        level = Number(level.toFixed(decimals));
    }
    if (level >= maxLevel) return maxLevel;
    if (level < 0) return 0;
    else return level;
}

/**
 * Converts hotm experience to level
 * @param {Number} experience amount of hotm experience
 * @param {{decimals: Number}} data number of decimals to return
 * @returns {Number} hotm level
 */
function getHotmLevel(experience, { decimals = 0 } = { decimals: 0 }) {
    if (!experience) return 0;
    const { table, maxLevel } = getTableAndMax('hotm');

    let level = skillTables[table].filter((exp) => exp <= experience).length - 1;
    if (level >= maxLevel) return maxLevel;

    if (decimals) {
        const nextExp = getNextLevelExperience({ level }, { skill: 'hotm' });
        level += (experience - skillTables[table][level]) / nextExp;
        level = Number(level.toFixed(decimals));
    }
    if (level >= maxLevel) return maxLevel;
    if (level < 0) return 0;
    else return level;
}

/**
 * Calcultes the class average based on the 5 classes
 * @param {Object} profileData profile data for the player
 * @param {Number} decimals number of decimals to return
 * @returns {Number} class average
 */
function getClassAverage(profileData, decimals = 0, capped = true) {
    const levels = Object.values(profileData?.dungeons?.player_classes || {}).map(c => getCataLevel(c?.experience || 0))
        .map(lvl => capped ? Math.min(50, lvl) : lvl);
    const average = levels.reduce((prev, level) => prev + level, 0) / levels.length;
    return Number(average.toFixed(decimals));
}

/**
 * Converts cata/class experience to level
 * @param {Number} experience amount of cata/class experience
 * @param {{decimals: Number}} data number of decimals to return
 * @returns {Number} cata/class level
 */
function getCataLevel(experience, { decimals = 0 } = { decimals: 0 }) {
    if (!experience) return 0;
    const { table, maxLevel } = getTableAndMax('dungeoneering');
    let level = skillTables[table].filter((exp) => exp <= experience).length - 1;
    if (decimals && level < 50) {
        const nextExp = getNextLevelExperience({ level }, { skill: 'dungeoneering' });
        level += (experience - skillTables[table][level]) / nextExp;
        level = Number(level.toFixed(decimals));
    }
    if (level === 50) {
        let overflow = experience - skillTables[table][50];
        level += overflow / 200000000;
        if (decimals)
            level = Number(level.toFixed(decimals));
    }
    if (level >= maxLevel) return maxLevel;
    if (level < 0) return 0;
    else return level;
}

module.exports = {
    getSkillLevel,
    getSkillAverage,
    getSlayerLevel,
    getHotmLevel,
    getCataLevel,
    getClassAverage,
};
