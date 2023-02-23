#!/usr/bin/env bun

import { readFileSync } from "fs";
import { readdir } from "fs/promises";
import { resolve } from "path";
import { chdir } from "process";
import { Buchta } from "../src/buchta";
import { addFile } from "./add";
import { initProject } from "./init";
import { bootstrapProject } from "./bootstrap";
import { finishBootstrap } from "./finish";

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

export interface BuchtaPluginTemplate {
    filename: string;
    content: string;
}

export class BuchtaCLI {
    cmd: string;
    args: string[];
    projectTemplates = new Map<string, Map<string, string>>();
    private templateOptions = new Map<string, Map<string, BuchtaProjectOption>>();
    private templateCallbacks = new Map<string, (opts: Map<string, BuchtaProjectOption>) => void>();
    private pluginTemplates = new Map<string, BuchtaPluginTemplate>();

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
                chdir(config.rootDirectory);
                
                if (config.plugins) {
                    config.plugins.forEach((plug: () => void) => {
                        plug.call(this);
                    })
                }
            } else {
                const { svelte } = await import("../plugins/svelte");
                const { preact } = await import("../plugins/preact");
                svelte().call(this);
                preact().call(this);
            }

            switch (this.cmd) {
                case "init":
                    this.init();
                    break;
                case "build":
                    this.build();
                    break;
                case "serve":
                    this.serve();
                    break;
                case "add":
                    this.add();
                    break;
                case "bootstrap":
                    this.bootstrap();
                    break;
                case "finish":
                    this.finish();
                    break;
                default:
                    this.help()
            }
        })();
    }

    init() {
        initProject.call(this);
    }

    build() {
        const app = new Buchta(null, true);
        app.build();
    }

    serve() {
        const app = new Buchta();
        app.run();
    }

    bootstrap() {
        bootstrapProject.call(this);
    }

    finish() {
        finishBootstrap.call(this);
    }

    add() {
        addFile.call(this);
    }

    help() {
        console.log('Usage: buchta [command] (ARGS)')
        console.log('Commands:');
        const msgs = [
            "  help\t\tDisplay this message",
            "  init\t\t(name)\n\t\tCreate new buchta project",
            "  bootstrap\t(name)\n\t\tBootstrap basic buchta project, install dependencies, edit config and finish it",
            "  finish\tFinish project creation after bootstrap\n",
            "  serve\t\tStart web server",
            "  build\t\tExport your web application",
            "  add\t\t(template|plugin|api|middleware|composable name)\n\t\tCreate new file from type template",
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

    getPluginTemplate(name: string) {
        return this.pluginTemplates.get(name);
    }

    setPluginTemplate(name: string, options: BuchtaPluginTemplate) {
        this.pluginTemplates.set(name, options);
    }

    setProjectTemplate(name: string, path: string, content: string) {
        const map = this.projectTemplates.get(name) || new Map<string, string>();

        map.set(path, content);

        this.projectTemplates.set(name, map);
    }
}

new BuchtaCLI();