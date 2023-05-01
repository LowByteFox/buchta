import { readFileSync } from "fs";
import { Mediator } from "./build/mediator";
import { handler, ssrPageBuildFunction } from "./build/page_handler";
import { tsTranspile } from "./build/transpilers/typescript";
import { TSDeclaration } from "./build/tsgen";
import { BuchtaLogger } from "./utils/logger";
import devServer, { earlyHook } from "./dev";
import pageBuilder from "./build";
import { CustomBundle } from "./bundleToolGen";
import { PluginManager, ServerPlugin } from "./PluginManager";
import { PluginBuilder } from "bun";
import { EventEmitter } from "node:events";
import { transpiler } from "./build/transpiler";

export interface BuchtaPlugin {
    name: string;
    dependsOn: string[];
    conflictsWith: string[];
    driver?: (this: Buchta) => void;
}

interface BuilderAPI {
    addTranspiler: (target: string, result: string, handler: transpiler) => void;
    addPageHandler: (extension: string, handler: handler) => void;
    addSsrPageHandler: (extension: string, handler: ssrPageBuildFunction) => void;
    addType: (extension: string, type: TSDeclaration | string, references?: {type: "types" | "path", value: string}[]) => void;
    globalDeclarations: (string | TSDeclaration)[];
    moduleDeclarations: {name: string; content: (TSDeclaration|string)[], globals?: (TSDeclaration|string)[] }[];
    references: {type: "types" | "path", value: string}[];
    imports: string[];
}

export interface BuchtaConfig {
    rootDir: string;
    port: number;
    ssr?: boolean;
    dirs?: string[];
    plugins?: BuchtaPlugin[];
}

export class Buchta extends EventEmitter {
    private _builder: Mediator;
    private conf?: BuchtaConfig;
    preparationFinished = false;
    logger;
    private plugins: BuchtaPlugin[];
    pages: any[] = [];
    bundle: CustomBundle;
    private bundleHandlers: Function[] = [];
    fileCache: Map<string, string> = new Map();
    pluginManager: PluginManager = new PluginManager(this);

    builder: BuilderAPI;
    rootDir: string;
    port: number;
    ssr: boolean;
    dirs: string[];

    attachToBundler(handler: (bun: CustomBundle) => void) {
        this.bundleHandlers.push(handler);
    }

    constructor(defaults = true, quiet = false, config?: BuchtaConfig) {
        super();
        this.logger = BuchtaLogger(quiet);
        if (!config) {
            try {
                this.conf = require(process.cwd() + "/buchta.config.ts").default;
                this.logger("Done loading config", "success");
            } catch (e) {
                this.logger.error("Failed to load the config: ");
                console.log(e);
            }
        } else {
            this.conf = config;
        }

        this.rootDir = this.getOrDef("rootDir", process.cwd());
        this.port = this.getOrDef("port", 3000);
        this.ssr = this.getOrDef("ssr", true);
        this.dirs = this.getOrDef("dirs", ["public"]);
        this.plugins = this.getOrDef("plugins", []);
        this._builder = new Mediator(this.rootDir, this.ssr);

        this.builder = {
            addTranspiler: (target, result, handler) => {
                if (this.pluginManager.checkAvailableRegister(target)) {
                    this.logger.error(`Unable to register "${target}" transpiler, plugin "${this.pluginManager.getRegisterOwner(target)}" has it`);
                    return;
                }
                this._builder.declareTranspilation(target, result, handler);
                this.pluginManager.pluginRegisterAction(target);
            },
            addPageHandler: (extension, handler) => {
                if (this.pluginManager.checkAvailableRegister(extension + "page")) {
                    this.logger.error(`Unable to register "${extension}" page handler, plugin "${this.pluginManager.getRegisterOwner(extension + "page")}" has it`);
                    return;
                }
                this._builder.setPageHandler(extension, handler);
                this.pluginManager.pluginRegisterAction(extension + "page");
            },
            addSsrPageHandler: (extension, handler) => {
                if (this.pluginManager.checkAvailableRegister(extension + "ssr")) {
                    this.logger.error(`Unable to register "${extension}" ssr handler, plugin "${this.pluginManager.getRegisterOwner(extension + "ssr")}" has it`);
                    return;
                }
                this._builder.setSSRPageHandler(extension, handler);
                this.pluginManager.pluginRegisterAction(extension + "ssr");
            },
            addType: (extension, type, references: {type: "types" | "path", value: string}[] = []) => {
                if (this.pluginManager.checkAvailableRegister(extension + "types")) {
                    this.logger.error(`Unable to register types for "${extension}", plugin "${this.pluginManager.getRegisterOwner(extension + "type")}" have them`);
                    return;
                }
                this._builder.setTypeGen(extension, type);
                this._builder.setTypeImports(extension, references);
                this.pluginManager.pluginRegisterAction(extension + "types");
            },
            moduleDeclarations: this._builder.moduleDeclarations,
            globalDeclarations: this._builder.globalDeclarations,
            references: this._builder.references,
            imports: this._builder.imports
        }

        this.bundle = new CustomBundle(this.rootDir);
        if (defaults) {
            earlyHook(this);
        }
    }

    async setup() {
        this.logger.info("Configuring build system");
        this._builder.prepare(this.dirs);
        this.bundleHandlers.forEach(b => b(this.bundle));
        this.bundle.dump();
        this._builder.declareTranspilation("ts", "js", tsTranspile);
        this._builder.setPageHandler("html", (_: string, path: string) => {
            const content = readFileSync(path, {"encoding": "utf8"});
            return content;
        });
        this._builder.setSSRPageHandler("html", (_1: string, _2: string, csrHTML: string, ..._: string[]) => {
            return csrHTML;
        });
        this.logger.info("Done configuring build system");
        this.logger.info("Loading plugins");

        for (const plug of this.plugins) {
            const { driver } = plug;
            delete plug.driver;
            if (this.pluginManager.addPlugin(plug)) {
                driver?.call(this);
                this.logger.success(`Plugin "${plug.name}" was loaded!`);
            }
        }

        const buchta = this;

        const filesPlugin: ServerPlugin = {
            name: "others",
            async setup(build: PluginBuilder) {
                // @ts-ignore sush
                build.onLoad({ filter: /\..+/}, ({ path }) => {
                    let ext = path.match(/\.(js|mjs|cjs|ts|jsx|tsx|txt|json|toml)$/g);
                    if (!ext) {
                        const data = {
                            path,
                            route: ""                        
                        }

                        if (!buchta.fileCache.has(path) && !buchta.preparationFinished) {
                            buchta.emit("fileLoad", data);
                            buchta.fileCache.set(path, data.path);
                        } else {
                            data.route = buchta.fileCache.get(path) ?? "";
                        }
 
                        return {
                            contents: `export default "${data.route}"`,
                            loader: "js"
                        }
                    }
                    // @ts-ignore types
                    ext = ext[0].split(".").pop();
                    // @ts-ignore types
                    if (ext == "mjs" || ext == "cjs") ext = "js";
                    return {
                        contents: readFileSync(path, {encoding: "utf-8"}),
                        loader: ext
                    }
                })
            }
        }

        this.pluginManager.setServerPlugin(filesPlugin);
        this.pluginManager.setBundlerPlugin(filesPlugin);

        this.pluginManager.injectPlugins();

        this.logger.info("Done loading plugins");

        this.logger.info("Executing the build system");
        this.logger.info("Transpiling");
        await this._builder.transpile();
        this._builder.toFS();
        this.logger.info("Generating Pages");
        await this._builder.pageGen(this.pluginManager.getBundlerPlugins());
        this.logger.info("Generating Types");
        this._builder.typeGen();

        this.logger.info("Emitting Routes");

        this.pages = this._builder.pageRouteGen();

        this.preparationFinished = true;

        return Promise.resolve(this);
    }

    dev() {
        this.logger.info(`Started dev server on port ${this.port}`);
        devServer(this.port, this.pages);
    }

    export() {
        this.logger.info(`Building webpage`);
        pageBuilder(this.pages);
    }

    private getOrDef(route: string, def: any) {
        let base: any = this.conf;
        if (!base) return def;
        for (const path of route.split(".")) {
            if (typeof base[path] != "undefined") {
                base = base[path];
            }
            else return def;
        }
        if (typeof base == "undefined") return def;
        return base;
    }
}

const app = new Buchta()

await app.setup();

app.dev();
