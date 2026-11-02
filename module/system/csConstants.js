export const CSConstants = {};

CSConstants.SYSTEM_ID = "chroniclesystem";
CSConstants.SYSTEM_PATH = "systems/chroniclesystem";

CSConstants.HouseRoles = {
    HEAD: "CS.sheets.house.character.roles.head",
    STEWARD: "CS.sheets.house.character.roles.steward",
    HEIR: "CS.sheets.house.character.roles.heir",
    FAMILY: "CS.sheets.house.character.roles.family",
    RETAINER: "CS.sheets.house.character.roles.retainer",
    SERVANT: "CS.sheets.house.character.roles.servant"
};

CSConstants.Templates = {
    Dialogs: {
        CHARACTER_ROLE_IN_HOUSE: "systems/chroniclesystem/templates/dialogs/characterRoleInHouse.hbs",
        HOUSE_RESOURCE_EDITOR: "systems/chroniclesystem/templates/dialogs/houseResourceEditor.hbs",
        ADDING_HOUSE_EVENT: "systems/chroniclesystem/templates/dialogs/addingHouseEvent.hbs",
        INITIATIVE_SELECTOR: "systems/chroniclesystem/templates/dialogs/initiative-selector.hbs",
        ROLL_MODIFIER: "systems/chroniclesystem/templates/dialogs/roll-modifier.hbs"
    },
    Apps: {
        IMPORTER: "systems/chroniclesystem/templates/apps/importer.hbs"
    }
};

CSConstants.Settings = {
    SYSTEM_NAME: "chroniclesystem",
    ASOIAF_DEFENSE_STYLE: "asoiafDefenseStyle",
    TRACE_LOGS: "traceLogs",
    DEBUG_LOGS: "debugLogs",
    CURRENT_VERSION: "version",
    MODIFIER_DIALOG_AS_DEFAULT: "isModifierDialogDefault",
    SHEET_THEME: "sheetTheme",
    OCR_LANGUAGE: "ocrLanguage"
};

CSConstants.SheetThemes = {
    FOUNDRY: "foundry",
    LIGHT: "light",
    DARK: "dark"
};

CSConstants.HouseResources = {
    DEFENSE: "CS.sheets.house.resources.defense",
    INFLUENCE: "CS.sheets.house.resources.influence",
    LANDS: "CS.sheets.house.resources.lands",
    LAW: "CS.sheets.house.resources.law",
    POPULATION: "CS.sheets.house.resources.population",
    POWER: "CS.sheets.house.resources.power",
    WEALTH: "CS.sheets.house.resources.wealth"
};

CSConstants.HouseResourceKeys = ["defense", "influence", "lands", "law", "population", "power", "wealth"];

CSConstants.InitiativeTypes = {
    COMBAT: "CS.dialogs.initiativeSelector.combat",
    INTRIGUE: "CS.dialogs.initiativeSelector.intrigue",
    WARFARE: "CS.dialogs.initiativeSelector.warfare"
};

CSConstants.InitiativeTypeRolls = {
    COMBAT: "specialty:quickness:agility",
    INTRIGUE: "specialty:reputation:status",
    WARFARE: "specialty:strategy:warfare"
};

CSConstants.TechniqueType = {
    SPELL: "CS.sheets.techniqueItem.types.spell",
    RITUAL: "CS.sheets.techniqueItem.types.ritual"
};

CSConstants.TechniqueCost = {
    NONE: "CS.sheets.generalLabels.none",
    SPEND_DESTINY: "CS.sheets.techniqueItem.costs.destinySpent",
    BURN_DESTINY: "CS.sheets.techniqueItem.costs.destinyBurnt",
    INVEST_DESTINY: "CS.sheets.techniqueItem.costs.destinyInvested",
    INJURY: "CS.sheets.character.injury",
    WOUND: "CS.sheets.character.wound",
    OTHER: "CS.sheets.generalLabels.others"
};

CSConstants.NpcKinds = {
    npc: "CS.sheets.npc.kinds.npc",
    creature: "CS.sheets.npc.kinds.creature",
    animal: "CS.sheets.npc.kinds.animal"
};

/** The nineteen standard SIFRP abilities, used by the importer and new-character setup. */
CSConstants.StandardAbilities = [
    "Agility", "Animal Handling", "Athletics", "Awareness", "Cunning", "Deception", "Endurance",
    "Fighting", "Healing", "Knowledge", "Language", "Marksmanship", "Persuasion", "Status",
    "Stealth", "Survival", "Thievery", "Warfare", "Will"
];

CSConstants.ItemTypesForCharacters = ["ability", "weapon", "armor", "equipment", "benefit", "drawback", "technique", "poison"];
CSConstants.ItemTypesForHouses = ["event", "holding"];
