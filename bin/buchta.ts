#!/usr/bin/env bun

import { readFileSync } from "fs";
import { readdir } from "fs/promises";
import { resolve } from "path";

process.argv = process.argv.slice(2);

export class BuchtaCLI {
    cmd: string;
    args: string[];
    projectTemplates = new Map<string, Map<string, string>>();

    constructor() {
        this.cmd = process.argv[0];
        this.args = process.argv;

        if (this.args.length == 0 || this.args.includes("-h") || this.args.includes("--help") || /(-h|--h|help)/.exec(this.cmd)) {
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
        })();
    }

    init() {

    }

    help() {
        console.log('Usage: buchta [command] (ARGS)')
        console.log('Commands:');
        const msgs = [
            "  help\t\tDisplay this message",
            "  init\t\tCreate new buchta project",
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
}

new BuchtaCLI();