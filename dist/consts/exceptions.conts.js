"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NRG_EXCEPTIONS = {
    NotAEnergyProjectException: {
        name: 'NotAEnergyProjectException',
        message: () => {
            return `This is not a valid EnergyCLI project. Run nrg init to create a CLI conf file.`;
        }
    },
    ItemWriteToDiskException: {
        name: 'ItemWriteToDiskException',
        message: (err) => {
            return `There was an error when trying to create the item to disk: ${err}`;
        }
    },
    MissingItemTypeFlagException: {
        name: 'MissingItemTypeFlagException',
        message: () => {
            return `The generate command has to be ran with the item-type flag. See help --g for more information`;
        }
    },
    MissingItemNameException: {
        name: 'MissingItemNameException',
        message: (itemType) => {
            return `The filename for the ${itemType} item is missing`;
        }
    },
    InvalidItemTypeGenerationException: {
        name: 'InvalidItemTypeGenerationException',
        message: () => {
            return `The requested item-type does not exist in the default types, nor in the additional types.`;
        }
    },
    NoValidFileTemplateForThisItemException: {
        name: 'NoValidFileTemplateForThisItemException',
        message: (itemName) => {
            return `You specified in the configuration that a custom file template should be used for "${itemName}" items, but neither the template field or the templateFile leads to a valid file, or the file is empty.`;
        }
    },
    InvalidRootFolderForScaffoldException: {
        name: 'InvalidRootFolderForScaffoldException',
        message: (rootFolder) => {
            return `Invalid root folder provided. This may happen when the folder is inside a folder that does not exists. In this stage, the root folder needs to be a single folder that can be created. Your root folder was: ${rootFolder}`;
        }
    }
};
//# sourceMappingURL=exceptions.conts.js.map