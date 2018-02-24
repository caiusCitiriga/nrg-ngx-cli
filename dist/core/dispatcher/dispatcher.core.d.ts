import { DispatcherOptions } from "../../interfaces/dispatcher-options.interface";
import { DispatcherCommandSet } from "../../interfaces/dispatcher-command-set.interface";
import { Observable } from "rxjs/Observable";
export declare class Dispatcher {
    private _parentCtorInitialized;
    constructor(parentCtorInitialized: Observable<boolean>);
    /**
     * Takes the configuration containing all the available commands and the current command set.
     * It searches the command through all the available commands in the configuration.
     * If a match is found the action binded to that command will be executed.
     * Otherwise an error on the console will be printed.
     */
    dispatch(configuration: DispatcherOptions[], commandSet: DispatcherCommandSet): void;
}