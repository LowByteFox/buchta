import { readFileSync } from "fs";
import { BuildPage, Mediator } from "./build/mediator";
import { tsTranspile } from "./build/transpilers/typescript";
import { EventManager } from "./utils/events";
import { BuchtaLogger } from "./utils/logger";
import { PluginManager } from "./PluginManager";
import { TranspilerHandler } from "./build/transpiler";
import { PageHandlerFunc, SSRPageHandlerFunc } from "./utils/pages";
import { BunPlugin } from "bun";
import devServer, { earlyHook } from "./server/dev.ts";

export interface BuchtaPlugin {
    name: string;
    dependsOn?: string[];
    conflictsWith?: string[];
    driver: (this: Buchta) => void;
}

export interface BuchtaConfig {
    rootDir: string;
    port: number;
    ssr?: boolean;
    dirs?: string[];
    plugins?: BuchtaPlugin[];
}

export class Buchta extends EventManager {
    [key: string]: any;
    // private for the functionality -> may have API
    private builder: Mediator;
    private pluginManager = new PluginManager(this);
    private pages: any[] = [];
    private fileCache: Map<string, string> = new Map();

    // public for use
    config?: BuchtaConfig;
    logger: any;
    earlyHook?: (build: Buchta) => void;

    // API
    addTranspiler(source: string, target: string, handler: TranspilerHandler) {
        this.builder.addTranspiler(source, target, handler);
    }
    addPageHandler(source: string, handler: PageHandlerFunc) {
        this.builder.addPageHandler(source, handler);
    }
    addSSRPageHandler(source: string, handler: SSRPageHandlerFunc) {
        this.builder.addSSRPageHandler(source, handler);
    }

    setServerPlugin(plug: BunPlugin) {
        this.pluginManager.setServerPlugin(plug);
    }
    setBundlerPlugin(plug: BunPlugin) {
        this.pluginManager.setBundlerPlugin(plug);
    }

    builderOn(event: string, handler: (...args: any[]) => void) {
        this.builder.on(event, handler);
    }

    constructor(quiet = false, config?: BuchtaConfig) {
        super();
        this.logger = BuchtaLogger(quiet);

        this.logger.info("Loading config");

        if (!config) {
            try {
                this.config = require(process.cwd() + "/buchta.config.ts").default;
                this.logger("Config loaded without issues", "success");
            } catch (e: any) {
                this.logger.error("Failed to load the config: ");
                console.log(e);
                process.exit(1);
            }
        } else {
            this.config = config;
        }

        this.builder = new Mediator(this.config?.rootDir ?? process.cwd(), this.config?.ssr ?? true);
    }

    async setup() {
        this.emit("beforeSetup", this);
        this.earlyHook?.(this);
        this.logger.info("Configuring build system");
        this.builder.addTranspiler("ts", "js", tsTranspile);
        this.builder.addPageHandler("html", (_: any, path: string) => readFileSync(path, {encoding: "utf-8"}));
        this.builder.addSSRPageHandler("html", (_: any, _1: any, html: string, _3: any) => Promise.resolve(html));

        this.logger.success("Build system configured");
        this.logger.info("Loading plugins");

        for (const plug of this.config?.plugins ?? []) {
            const { driver } = plug;
            if (this.pluginManager.addPlugin(plug)) {
                try {
                    driver?.call(this);
                    this.logger.success(`Plugin "${plug.name}" was loaded!`);
                } catch (e: any) {
                    this.logger.error(`Plugin "${plug.name}" wasn't loaded! ${e.toString()}`);
                    console.log(e);
                }
            }
        }

        const otherFiles: BunPlugin = {
            name: "other files plugin",
            setup: (build) => {
                // @ts-ignore sush
                build.onLoad({ filter: /.*(?<!\.(js|mjs|cjs|ts|mts|cts|jsx|tsx|txt|json|toml|wasm)$)$/ }, ({ path }) => {
                    let data = {
                        path,
                        route: ""
                    }

                    if (!this.fileCache.has(path)) {
                        this.emit("fileLoad", data);
                        this.fileCache.set(path, data.route);
                    } else data.route = this.fileCache.get(path) ?? "";

                    return {
                        contents: `export default "${data.route}"`,
                        loader: "js"
                    }
                })
            },
        }
        // must be for both
        this.pluginManager.setServerPlugin(otherFiles);
        this.pluginManager.setBundlerPlugin(otherFiles);
        this.pluginManager.injectPlugins();

        this.logger.success("Plugins loaded");
        this.logger.info("Starting up the build system");
        this.builder.prepare(this.config?.dirs ?? ['public']);
        this.logger.info("Transpiling");
        try {
            await this.builder.transpileEverything();
        } catch (e: any) {
            this.logger.error("Transpilation failed, STOP!");
            console.log(e);
            process.exit(1);
        }
        this.logger.success("Finished transpilation");
        this.builder.saveEverything();
        this.logger.info("Generating pages");
        let pages = [];
        try {
            pages = await this.builder.generatePages();
        } catch (e: any) {
            this.logger.error("Page generation failed, STOP!");
            console.log(e);
            process.exit(1);
        }
        this.logger.success("Pages generated");
        this.logger.info("Bundling pages");
        try {
            await this.builder.bundlePages(pages as BuildPage[], this.pluginManager.getBundlerPlugins());
        } catch(e: any) {
            this.logger.error("Page bundling failed, STOP");
            console.log(e);
            process.exit(1);
        }
        this.logger.success("Pages bundled");
        pages.push(...this.builder.getSSRPages());
        pages.push(...this.builder.getLeftovers());

        this.pages = pages;
        this.emit("afterSetup", this);
        return this;
    }

    dev() {
        this.logger.info(`Started dev server on port ${this.config?.port ?? 3000}`);
        devServer.call(this, this.config?.port ?? 3000, this.pages);
    }
}

/*
process.env.NODE_ENV = "development"

const a = new Buchta();
a.earlyHook = earlyHook;
await a.setup();
a.dev();
*/
