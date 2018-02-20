#! /usr/bin/env node
import * as process from 'process';

import 'rxjs/add/operator/filter';

import { UI } from './services/ui.service';

export class EnergyCLI {
    private args: string[] = [];

    public constructor() {
    }

    public start() {
        this.cleanupArgs();

        if (this.args.length) {
            this.dispatch();
            return;
        }
    }

    private dispatch() {
        console.log(this.args[0]);
    }


    private cleanupArgs() {
        this.args = process.argv;
        this.args.shift();
        this.args.shift();
    }
}

const NRG = new EnergyCLI();
NRG.start();