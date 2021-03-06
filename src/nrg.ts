import 'reflect-metadata';
import 'rxjs/add/operator/filter';

import * as fs from 'fs';
import * as process from 'process';

import { Subscription } from 'rxjs/Subscription';
import { injectable, inject, named } from 'inversify';

import { SmartCLI } from 'smart-cli/dist';
import { IoCContainer } from './inversify.config';
import { IFlag } from 'smart-cli/dist/interfaces/plain/flag.interface';

import { ItemTypes } from './enums/item-types.enum';

import { TYPES } from './consts/types.const';
import { NAMED_TYPES } from './consts/types.const';
import { PACKAGE_INFO } from './config/package.info';
import { CLI_CONF_FILENAME } from './config/cli-defaults.config';

import { IEnergy } from './interfaces/energy.interface';
import { IConfReader } from './interfaces/conf-reader.interface';
import { ICommandRunner } from './interfaces/command-runner.interface';

@injectable()
export class EnergyCLI implements IEnergy {
    private _cli: SmartCLI;
    private _initComand: ICommandRunner;
    private _scaffoldComand: ICommandRunner;
    private _generateComand: ICommandRunner;

    public constructor(
        @inject(TYPES.ICommandRunner)
        @named(NAMED_TYPES.ScaffoldCommand)
        scaffoldComand: ICommandRunner,

        @inject(TYPES.ICommandRunner)
        @named(NAMED_TYPES.GenerateCommand)
        generateComand: ICommandRunner,

        @inject(TYPES.ICommandRunner)
        @named(NAMED_TYPES.InitCommand)
        initComand: ICommandRunner,
    ) {
        //  Initialization of stuff
        this.initSmartCLI();
        this._cli = new SmartCLI();
        this._initComand = initComand;
        this._scaffoldComand = scaffoldComand;
        this._generateComand = generateComand;
    }

    /**
     * Runs the program with the given args
     * 
     * @param {string} args 
     * @memberof EnergyCLI
     */
    public runProgram(args: string): void {
        //  To prevent commands duplicates into SmartCLI using the same instance
        this.initSmartCLI();
        // Sets all the commands to SmartCLI
        this.setupCLI();

        this._cli.run(args);
    }

    private initSmartCLI(): void {
        this._cli = new SmartCLI();
    }

    private setupCLI(): void {
        this._cli
            //  TODO REMOVE
            .addCommand({
                name: 'test',
                flags: [],
                description: 'Test command',
                action: (flags: IFlag[]) => {
                    this._scaffoldComand.run(flags);
                }
            })
            //  TODO REMOVE
            .addCommand({
                name: 'info',
                flags: [],
                description: 'Prints the current Energy version information',
                action: (flags: IFlag[]) => {
                    this._cli.UI.out.printBoxTitle('ENERGY CLI PACKAGE INFORMATION');
                    this._cli.UI.out.printMessage('Made with love and passion. For coding, and beautiful code\n');
                    this._cli.UI.out.printKeyValues({
                        set: [
                            {
                                k: 'Version',
                                v: PACKAGE_INFO.version
                            },
                            {
                                k: 'Release name',
                                v: PACKAGE_INFO.name
                            },
                            {
                                k: 'License',
                                v: 'MIT'
                            },
                            {
                                k: 'Designed and developed by',
                                v: 'Caius Citiriga'
                            },
                            {
                                k: 'Bugs and features reaquests',
                                v: 'https://www.github.com/caiuscitiriga/nrg-cli/issues'
                            },
                        ]
                    });

                }
            })
            .addCommand({
                name: 'scaffold',
                flags: [
                    {
                        name: 'root',
                        description: 'The relative path to use as root folder for the structure to scaffold',
                        options: []
                    }
                ],
                description: 'Scaffolds the structure defined in the CLI config file.',
                action: (flags: IFlag[]) => {
                    this._scaffoldComand
                        .run(flags)
                        .subscribe(res => {
                            if (!!res) {
                                console.log();
                                this._cli.UI.out.printInfo('Structure successfully scaffolded.\n');
                            }
                        });
                }
            })
            .addCommand({
                flags: [],
                name: 'init',
                description: 'Initializes a Energy project inside the current folder',
                action: (flags: IFlag[]) => {
                    const sub: Subscription =
                        this._initComand
                            .run(flags)
                            .subscribe(res => {
                                console.log();
                                this._cli.UI.out.printInfo(`${CLI_CONF_FILENAME} file successfully generated\n`);
                            });
                }
            })
            .addCommand({
                name: 'g',
                description: 'Generates a new item',
                flags: [
                    {
                        name: 'dto',
                        description: 'DTO',
                        options: []
                    },
                    {
                        name: 'enum',
                        description: 'Enum',
                        options: []
                    },
                    {
                        name: 'model',
                        description: 'Model',
                        options: []
                    },
                    {
                        name: 'const',
                        description: 'Constant',
                        options: []
                    },
                    {
                        name: 'entity',
                        description: 'Entity',
                        options: []
                    },
                    {
                        name: 'int',
                        description: 'Interface',
                        options: []
                    }
                ],
                action: (flags: IFlag[]) => {
                    const sub: Subscription =
                        this._generateComand
                            .run(flags)
                            .filter(res => !!res)
                            .subscribe(res => {
                                this._cli.UI.out.printInfo('Item generated successfully!')
                                return sub.unsubscribe();
                            });
                }
            })
    }
}
