#!/usr/bin/env bun

import { readFileSync } from "fs";
import { readdir } from "fs/promises";
import { resolve } from "path";
import { initProject } from "./init";

process.argv = process.argv.slice(2);

export enum BuchtaQuestionType {
    YES_OR_NO = 16514,
    TEXT_INPUT,
    SELECT
}

export interface BuchtaProjectOption {
    pretty: string;
    value?: string;
    type: BuchtaQuestionType;
    selectData?: string[];
}

export class BuchtaCLI {
    cmd: string;
    args: string[];
    projectTemplates = new Map<string, Map<string, string>>();
    private templateOptions = new Map<string, Map<string, BuchtaProjectOption>>();
    private templateCallbacks = new Map<string, (opts: Map<string, BuchtaProjectOption>) => void>();

    constructor() {
        this.cmd = process.argv[0];
        this.args = process.argv;
        this.args.shift();

        if (this.args.includes("-h") || this.args.includes("--help") || /(-h|--h|help)/.exec(this.cmd)) {
            this.help();
        }

        // @ts-ignore It is there
        (async () => {
            const dir = import.meta.dir + "/projects/";
            const unfilteredFiles = await this.getFiles(dir);
            const files = unfilteredFiles.map(e => e.slice(dir.length));
            files.forEach((file, i) => {
                const type = file.split("/", 1)[0];
                const path = file.slice(file.indexOf("/"));
                const map = this.projectTemplates.get(type) || new Map<string, string>();

                map.set(path, readFileSync(unfilteredFiles[i], {encoding: "utf-8"}));

                this.projectTemplates.set(type, map);
            })

            let config = null;

            try {
                config = (await import(process.cwd() + "/buchta.config.ts")).default;
            } catch {}

            if (config) {
                config.plugins.forEach(plug => {
                    plug.call(this);
                })
            }

            if (this.cmd == "init") {
                this.init();
            }
        })();
    }

    init() {
        initProject.call(this);
    }

    help() {
        console.log('Usage: buchta [command] (ARGS)')
        console.log('Commands:');
        const msgs = [
            "  help\t\tDisplay this message",
            "  init\t\t(name)\n\t\tCreate new buchta project",
            "  serve\t\tStart web server",
            "  build\t\tExport your web application",
            "  add\t\t(template|plugin|get|post|put|delete|middleware name)\n\t\tCreate new file from type template",
            ""
        ];
        msgs.forEach(m => console.log(m));
        process.exit(0);
    }

    private async getFiles(dir: string) {
        const dirents = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = resolve(dir, dirent.name);
            return dirent.isDirectory() ? this.getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    }

    getTemplateOptions(name: string) {
        return this.templateOptions.get(name) || new Map<string, string>();
    }
    
    setTemplateOptions(name: string, options: Map<string, BuchtaProjectOption>) {
        this.templateOptions.set(name,  options);
    }

    getTemplateCallback(name: string) {
        return this.templateCallbacks.get(name);
    }

    setTemplateCallback(name: string, callback: (opts: Map<string, BuchtaProjectOption>) => void) {
        this.templateCallbacks.set(name, callback);
    }
}

new BuchtaCLI();