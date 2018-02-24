import * as fs from 'fs';
import * as path from 'path';

import { Subject } from 'rxjs/Subject';
import { SmartCLI } from "smart-cli/dist";
import { Observable } from "rxjs/Observable";

import { UI } from "../ui.core";

import { DEFAULTS } from '../../config/defaults.conf';
import { CORE_COMMANDS } from "../../consts/core-commands.const";
import { AvailableItemTypes } from "../../enums/available-item-types.enum";

import { CommandFlag } from "../../interfaces/command-flag.interface";
import { CLIConfiguration } from '../../interfaces/cli-conf.interface';
import { CommandRunner } from "../../interfaces/command-runner.interface";
import { DispatcherOptions } from "../../interfaces/dispatcher-options.interface";
import { ItemToGenerateOptions } from "../../interfaces/item-to-generate-options.interface";

//  Since is generated getting inputs from user, the reference to "GenerateCommand" gets lost.
//  Needs to be therefore static inside
export class GenerateCommand implements CommandRunner {
    private static pathDelimiter: string;
    private static currentFlags: CommandFlag;
    private static itemToGenerate: ItemToGenerateOptions;

    public constructor() {
        GenerateCommand.pathDelimiter = '/';
        GenerateCommand.itemToGenerate = {
            type: null as any,
            filename: '',
            className: '',
            extension: '',
            relativePathFromSrc: ''
        };
    }

    public run(dispatcherOptions: DispatcherOptions[], flags: CommandFlag[]): void {
        GenerateCommand.resetItemToGenerate();
        if (!GenerateCommand.ensureIsEnergyProject()) {
            UI.error('Your are not inside an Energy project. Cannot run this command here.');
            return;
        }

        //  Take the part before any -flag:options. The flag itself
        switch (flags[0] ? flags[0].flag.split(':')[0] : null) {
            case CORE_COMMANDS.generate.flags.dto.value:
                return GenerateCommand.shorthand(AvailableItemTypes.dto, flags);
            case CORE_COMMANDS.generate.flags.core.value:
                return GenerateCommand.shorthand(AvailableItemTypes.core, flags);
            case CORE_COMMANDS.generate.flags.enum.value:
                return GenerateCommand.shorthand(AvailableItemTypes.enum, flags);
            case CORE_COMMANDS.generate.flags.const.value:
                return GenerateCommand.shorthand(AvailableItemTypes.const, flags);
            case CORE_COMMANDS.generate.flags.entity.value:
                return GenerateCommand.shorthand(AvailableItemTypes.entity, flags);
            case CORE_COMMANDS.generate.flags.service.value:
                return GenerateCommand.shorthand(AvailableItemTypes.service, flags);
            case CORE_COMMANDS.generate.flags.interface.value:
                return GenerateCommand.shorthand(AvailableItemTypes.interface, flags);
            default:
                GenerateCommand.currentFlags = flags[0];
                GenerateCommand.generateItem();
                break;
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////
    //  Internals
    ////////////////////////////////////////////////////////////////////////////////////
    private static shorthand(type: AvailableItemTypes, flags: CommandFlag[]): void {
        const opts = flags[0].flag.split(':');

        opts.shift();
        const extension = opts.join().split(',')[1];
        const filenameAndPath = opts.join().split(',')[0];

        GenerateCommand.itemToGenerate.type = type;
        GenerateCommand.itemToGenerate.extension = extension;
        GenerateCommand.itemToGenerate.filename = GenerateCommand.extractFilename(filenameAndPath);
        GenerateCommand.itemToGenerate.relativePathFromSrc = GenerateCommand.extractRelativePathFromItemSourceFolder(filenameAndPath);
        GenerateCommand.itemToGenerate.className = GenerateCommand.extractClassname(`${GenerateCommand.itemToGenerate.filename}.${extension}`, true);

        const sub = GenerateCommand
            .startFileGenerationForThisItem()
            .subscribe(res => {
                if (!res) {
                    UI.error(`Couldn't create the item. Aborting.`);
                    sub.unsubscribe();
                    return;
                }
                UI.success('Job completed successfully');
                sub.unsubscribe();
            });
    }


    private static resetItemToGenerate(): void {
        GenerateCommand.itemToGenerate.className = '';
        GenerateCommand.itemToGenerate.extension = '';
        GenerateCommand.itemToGenerate.filename = '';
        GenerateCommand.itemToGenerate.relativePathFromSrc = '';
        GenerateCommand.itemToGenerate.type = null as any;
    }

    private static ensureIsEnergyProject(): boolean {
        const dir = fs.readdirSync('.');
        if (!dir.find(file => file === DEFAULTS.cliConfigurationFilename)) {
            return false;
        }

        return true;
    }

    private static generateItem(): void {
        GenerateCommand.printAvailableTypesList();
        UI.askUserInput('> ', GenerateCommand.getItemTypeFromUser);
    }

    private static printAvailableTypesList(): void {
        const kvp: { key: string, value: string }[] = [];
        const dirtyTypes = Object.keys(AvailableItemTypes);
        const cleanTypes: string[] = [];

        dirtyTypes.forEach(t => isNaN(parseInt(t)) ? cleanTypes.push(t) : null);

        cleanTypes.forEach((type: string, idx) => {
            kvp.push({ key: type, value: (idx + 1).toString() });
        });

        console.log();
        SmartCLI.GenericOutput.printTitle('New item generation');
        SmartCLI.GenericOutput.printKeyValue(kvp);
        UI.print('Type the name, or the corresponding number to generate the item');
    }

    private static extractRelativePathFromItemSourceFolder(data: string): string {

        const explodedFilenameByPathDelimiter = data.split(GenerateCommand.pathDelimiter);
        explodedFilenameByPathDelimiter.pop();

        if (!explodedFilenameByPathDelimiter.length) { return ''; }

        let path = '';
        explodedFilenameByPathDelimiter.forEach((folder, index) => {
            path += folder + GenerateCommand.pathDelimiter;
        });

        return path;
    }

    private static extractFilename(data: string): string {
        const explodedFilenameByPathDelimiter = data.split(GenerateCommand.pathDelimiter);
        return explodedFilenameByPathDelimiter[explodedFilenameByPathDelimiter.length - 1];
    }

    private static extractClassname(data: string, isShorhandMode = false): string {
        const explodedFileByDash = GenerateCommand.itemToGenerate.filename.split('-');
        let className = '';
        explodedFileByDash.forEach(part => {
            //  If it contains a dot, it may be the extension, or a specific typename. Skip it
            if (part.indexOf('.') != -1 && part.split('.').length === 1) { return; }
            //  If instead, it has a "composite custom dot notation" parse it skipping the last one.
            if (part.indexOf('.') != -1 && part.split('.').length >= 3) {
                className += GenerateCommand.extractMultipleUserCustomExtensions(part, isShorhandMode);
                return;
            }
            //  If none of the statements before where true, it means that the file is like "item.ext"
            className += (part.charAt(0).toUpperCase()) + (part.slice(1).toLowerCase()).split('.')[0];
        });

        return className;
    }

    private static extractExtension(data: string): string | boolean {
        //  Try to extract the extension. Throw if can't
        const explodedFileByDot = GenerateCommand.itemToGenerate.filename.split('.')
        if (explodedFileByDot.length === 1) { return false; };

        return explodedFileByDot[explodedFileByDot.length - 1];
    }

    private static extractMultipleUserCustomExtensions(part: string, isShorthand = false): string {
        let customPart = '';
        const explodedPart = part.split('.');
        !isShorthand ? explodedPart.pop() : null;

        if (explodedPart.length === 0) {
            throw new Error('Something went wrong in extractMultipleUsersCustomExtension. The part arrived, has only one element in it');
        }

        explodedPart.forEach(p => customPart += (p.charAt(0).toUpperCase()) + (p.slice(1).toLowerCase()));
        return customPart;
    }

    private static startFileGenerationForThisItem(): Observable<boolean> {
        const jobDone: Subject<boolean> = new Subject();
        try {
            const foldersStack = GenerateCommand.composeFoldersStack();
            if (GenerateCommand.itemToGenerate.type === AvailableItemTypes.custom) {
                const err = new Error();
                err.message = 'The custom types are not handled yet.';
                err.name = 'Method not implemented exception';
                throw err;
            } else {
                const filename = GenerateCommand.generateFilename(foldersStack);
                fs.writeFile(filename, GenerateCommand.getFileTemplate(GenerateCommand.itemToGenerate.type), (err: Error) => {
                    if (err) {
                        throw new Error(`Error creating the item: ${err.message}`);
                    }

                    UI.success(`File ${filename} generated`);
                    jobDone.next(true);
                });
            }
        } catch (e) {
            const error = e as Error;
            if (error.message === 'Invalid CLI configuration') {
                UI.warn('Your CLI configuration appears to be corrupted.');
            }
            if (error.name === 'Method not implemented exception') {
                UI.warn('This feature is not available yet. Sorry.');
            }

            jobDone.next(false);
        }

        return jobDone.asObservable();
    }

    private static getFileTemplate(type: AvailableItemTypes): string {
        let template = '';
        switch (type) {
            case AvailableItemTypes.dto:
            case AvailableItemTypes.core:
            case AvailableItemTypes.entity:
            case AvailableItemTypes.service:
                template = `export class ${GenerateCommand.itemToGenerate.className} {\n\n}`;
                break;
            case AvailableItemTypes.enum:
                template = `export enum ${GenerateCommand.itemToGenerate.className} {\n\n}`;
                break;
            case AvailableItemTypes.interface:
                template = `export interface ${GenerateCommand.itemToGenerate.className} {\n\n}`;
                break;
            case AvailableItemTypes.custom:
                throw new Error('Custom files tempaltes not handled yet');
            default:
                break;
        }

        return template;
    }

    private static composeFoldersStack(): string {
        let foldersStack = GenerateCommand.getCLIConf().sourceFolder + path.sep + `${AvailableItemTypes[GenerateCommand.itemToGenerate.type]}s` + path.sep;
        if (!fs.existsSync(foldersStack)) {
            fs.mkdirSync(foldersStack); // if the item-type folder doesn't exists, create it
        }

        const explodedPathToCheck = GenerateCommand
            .itemToGenerate
            .relativePathFromSrc
            .split(GenerateCommand.pathDelimiter);

        //  Remove the last "" element
        explodedPathToCheck.pop();
        explodedPathToCheck
            .forEach((folder: string) => {
                foldersStack += folder + path.sep;
                if (!fs.existsSync(foldersStack)) {
                    fs.mkdirSync(foldersStack);
                    if (!fs.readdirSync(foldersStack)) {
                        throw new Error(`The folder ${folder} wasn't created. Aborting`);
                    }

                    UI.success(`Folder ${folder} created`);
                }
            });

        return foldersStack;
    }

    private static generateFilename(previousFoldersStack: string): string {
        let filename = '';
        // If the item-type is already included in the filename by the user, and the extension is present, add only the extension
        if (GenerateCommand.itemToGenerate.filename.indexOf(AvailableItemTypes[GenerateCommand.itemToGenerate.type]) !== -1 && !!GenerateCommand.itemToGenerate.extension.length) {
            filename = `${previousFoldersStack + GenerateCommand.itemToGenerate.filename}.${GenerateCommand.itemToGenerate.extension}`;
        }
        //  If the item-type is NOT included, and the user has provided an extension
        if (GenerateCommand.itemToGenerate.filename.indexOf(AvailableItemTypes[GenerateCommand.itemToGenerate.type]) === -1 && !!GenerateCommand.itemToGenerate.extension.length) {
            filename = `${previousFoldersStack + GenerateCommand.itemToGenerate.filename}.${AvailableItemTypes[GenerateCommand.itemToGenerate.type]}.${GenerateCommand.itemToGenerate.extension}`;
        }
        //  If the item-type is included, and the extension is not provided, suppose that is included in the filename after the item-type dot notation
        if (GenerateCommand.itemToGenerate.filename.indexOf(AvailableItemTypes[GenerateCommand.itemToGenerate.type]) !== -1 && !GenerateCommand.itemToGenerate.extension.length) {
            filename = `${previousFoldersStack + GenerateCommand.itemToGenerate.filename}`;
        }
        //  If the item-type is NOT included, and the extension is implicitly included in the filename
        if (GenerateCommand.itemToGenerate.filename.indexOf(AvailableItemTypes[GenerateCommand.itemToGenerate.type]) === -1 && !GenerateCommand.itemToGenerate.extension.length) {
            const extPosition = GenerateCommand.itemToGenerate.filename.lastIndexOf('.');
            filename = [
                previousFoldersStack,
                GenerateCommand.itemToGenerate.filename.slice(0, extPosition),
                '.',
                AvailableItemTypes[GenerateCommand.itemToGenerate.type],
                GenerateCommand.itemToGenerate.filename.slice(extPosition)
            ].join('');
        }

        return filename;
    }

    private static getCLIConf(): CLIConfiguration {
        try {
            const conf: CLIConfiguration = JSON.parse(fs.readFileSync(process.cwd() + path.sep + DEFAULTS.cliConfigurationFilename).toString()) as CLIConfiguration;
            return conf;

        } catch (e) {
            throw new Error('Invalid CLI configuration');
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////
    //  Input getters
    ////////////////////////////////////////////////////////////////////////////////////
    private static getItemTypeFromUser(data: string): void {
        //  If is typed as string
        if (isNaN(parseInt(data)) && !!(AvailableItemTypes as any)[data]) {
            GenerateCommand.itemToGenerate.type = (AvailableItemTypes as any)[data];
        } else {
            if (!(AvailableItemTypes as any)[data]) {
                UI.throw('The given type is invalid', GenerateCommand.generateItem);
                return;
            }
            GenerateCommand.itemToGenerate.type = data as any;
        }

        GenerateCommand.askForItemFilename();
    }

    private static getItemFilenameFromUser(data: string): void {
        if (!data) {
            UI.throw(`The given filename: "${data}" is not valid`, GenerateCommand.askForItemFilename);
            return;
        }

        GenerateCommand.itemToGenerate.relativePathFromSrc = GenerateCommand.extractRelativePathFromItemSourceFolder(data);
        GenerateCommand.itemToGenerate.filename = GenerateCommand.extractFilename(data);
        GenerateCommand.itemToGenerate.className = GenerateCommand.extractClassname(data);

        const extension = GenerateCommand.extractExtension(data);
        if (!extension || extension === AvailableItemTypes[GenerateCommand.itemToGenerate.type]) {
            GenerateCommand.askForItemExtension();
            return;
        }

        const sub = GenerateCommand
            .startFileGenerationForThisItem()
            .subscribe(res => {
                if (!res) {
                    UI.error(`Couldn't create the item. Aborting.`);
                    sub.unsubscribe();
                    return;
                }
                UI.success('Job completed successfully');
                sub.unsubscribe();
            });
    };

    private static getItemExtensionFromUser(data: string): void {
        if (!data) {
            SmartCLI.GenericOutput.printWarning('Invalid extension name');
            GenerateCommand.askForItemExtension();
        }

        GenerateCommand.itemToGenerate.extension = data;
        UI.success('Extension successfully set');
        const sub = GenerateCommand
            .startFileGenerationForThisItem()
            .subscribe(res => {
                if (!res) {
                    UI.error(`Couldn't create the item. Aborting.`);
                    sub.unsubscribe();
                    return;
                }
                UI.success('Job completed successfully');
                sub.unsubscribe();
            });
    }

    ////////////////////////////////////////////////////////////////////////////////////
    //  Askers
    ////////////////////////////////////////////////////////////////////////////////////
    private static askForItemFilename(): void {
        UI.print(`Type the filename for the new ${AvailableItemTypes[GenerateCommand.itemToGenerate.type]}`, true);
        UI.askUserInput('> ', GenerateCommand.getItemFilenameFromUser);
    }

    private static askForItemExtension(): void {
        UI.print(`Type the filename extension`, true);
        UI.askUserInput('> ', GenerateCommand.getItemExtensionFromUser);
    }
}