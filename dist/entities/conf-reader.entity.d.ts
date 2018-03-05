import 'reflect-metadata';
import { IConfReader } from "../interfaces/conf-reader.interface";
import { IEnergyAdditionalTypeCLIConf } from '../interfaces/energy-cli-conf.interface';
export declare class ConfReader implements IConfReader {
    private _cliConfFilename;
    private _configFile;
    constructor();
    private ensureIsEnergyProjectFolder();
    private readConf();
    private fillMissingConfigurationsWithDefaults();
    getSrcFolder(): string;
    getDefaultFilesExt(): string;
    getAdditionalTypes(): IEnergyAdditionalTypeCLIConf[];
}