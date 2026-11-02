const PATH = "systems/chroniclesystem/templates";

export const preloadHandlebarsTemplates = async function () {
    const templatePaths = [
        `${PATH}/items/partials/header.hbs`,
        `${PATH}/items/partials/header-delete.hbs`,
        `${PATH}/items/partials/description.hbs`,
        `${PATH}/items/partials/physical-item.hbs`,
        `${PATH}/items/partials/equipment-item.hbs`,
        `${PATH}/items/partials/qualities-list.hbs`,
        `${PATH}/items/partials/source-field.hbs`,

        `${PATH}/items/tabs/technique-details-tab.hbs`,
        `${PATH}/items/tabs/technique-works-tab.hbs`,

        `${PATH}/actors/partials/form-group.hbs`,
        `${PATH}/components/rating-checkbox.hbs`,
        `${PATH}/components/house-resource-item.hbs`,
        `${PATH}/components/member-list-item.hbs`,
        `${PATH}/components/resource-holdings.hbs`
    ];
    return foundry.applications.handlebars.loadTemplates(templatePaths);
};
