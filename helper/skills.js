const { skillTables } = require('../constants/global.js');

function getTableAndMax(skill, manualCap) {
    const table =
        skill === 'dungeonClass'
            ? 'dungeoneering'
            : ['social', 'runecrafting', 'dungeoneering'].includes(skill)
            ? skill
            : skill === 'slayer'
            ? skill
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
    const skills = ['farming', 'mining', 'combat', 'foraging', 'fishing', 'enchanting', 'alchemy', 'taming'];
    const levels = skills.map((skill) => {
        const manualCap =
            skill === 'farming' && profileData.jacob2?.perks.farming_level_cap > -1 ? 50 + profileData.jacob2?.perks.farming_level_cap : null;
        return getSkillLevel(profileData[`experience_skill_${skill}`], { skill, decimals, manualCap });
    });
    const average = levels.reduce((acc, val) => acc + val) / levels.length;

    return Number(average.toFixed(decimals));
}

module.exports = {
    getSkillLevel,
    getSkillAverage,
};
