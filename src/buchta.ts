// The black space between code is a strange and mysterious place. It's dark and eerie, but full of hidden secrets waiting to be discovered.
import { readFileSync, readdirSync, statSync } from "fs";
import { Mediator } from "./build/mediator.js";
import { ConfigManager } from "./config_manager.js";
import { Router, route } from "./router.js";
import { dirname, join, normalize, relative } from "path";
import { createRequire } from "module";
import { BuchtaRequest } from "./request.js";
import { BuchtaResponse } from "./response.js";
import { handler, ssrPageBuildFunction } from "./build/page_handler.js";
import { tsTranspile } from "./build/transpilers/typescript.js";
import { TSDeclaration, TSGenerator } from "./build/tsgen.js";

const require = createRequire(import.meta.url);

function traverseDir(dirPath: string, result: [string[]] = [[]], baseDir?: string) {
    const files = readdirSync(dirPath);
    if (!baseDir) baseDir = dirPath;

    files.forEach(file => {
        const filePath = join(dirPath, file);

        if (statSync(filePath).isDirectory()) {
            traverseDir(filePath, result, baseDir);
        } else {
            const relativePath = relative(baseDir ?? filePath, filePath);
            result[0].push(relativePath);
        }
    });
}

interface BuilderAPI {
    addTranspiler: (target: string, result: string, handler: (this: any, route: string, path: string) => string) => void;
    addPageHandler: (extension: string, handler: handler) => void;
    addSsrPageHandler: (extension: string, handler: ssrPageBuildFunction) => void;
    addType: (extension: string, type: TSDeclaration | string, references?: {type: "types" | "path", value: string}[]) => void;
}

interface PluginOwns {
    fileExtensions?: string[];
}

export class Buchta {
    [x: string]: any;

    // INFO: will have API methods 
    private router = new Router();
    private config = new ConfigManager(`${process.cwd()}/buchta.config.ts`);
    private _builder: Mediator; 
    private serveFiles: string[] = [];

    // INFO: Plugin infos
    private registeredPlugins: any[] = [];
    private currentPlugin: string = "";
    private pluginOwns: Map<string, PluginOwns> = new Map();

    get: route;
    post: route;
    put: route;
    delete: route;
    
    // INFO: public API varaibles
    rootDir: string;
    port: number;
    ssr: boolean;
    builder: BuilderAPI;

    constructor() {
        const methods = ["get", "post", "put", "delete"];
        for (const m of methods) {
            this[m] = (route: string, handler: route) => {
                this.router[m](route, handler);
           }
        }
        
        let plugins = [];

        if (this.config.ok) {
            this.rootDir = this.config.getValue("root") ?? process.cwd();
            this.port = this.config.getValue("port") ?? 3000;
            this.ssr = this.config.getValue("ssr") ?? true;
            plugins = this.config.getValue("plugins") ?? [];
        } else {
            this.rootDir = process.cwd();
            this.port = 3000;
            this.ssr = true;
        }

        this.builder = {
            addTranspiler: (target: string, result: string, handler: (this: any, route: string, path: string) => string) => {
                if (!this.checkExtensionOwnership(this.currentPlugin, target)) {
                    console.error(`Plugin "${this.currentPlugin}" is unable to register a transpiler, because another plugin already did it!`);
                    return;
                }
                const plug: PluginOwns = this.pluginOwns.get(this.currentPlugin) ?? {};
                if (!plug.fileExtensions) plug.fileExtensions = [];
                if (!plug.fileExtensions.includes(target)) plug.fileExtensions.push(target);

                this._builder.declareTranspilation(target, result, handler);

                this.pluginOwns.set(this.currentPlugin, plug);
            },

            addPageHandler: (extension: string, handler: handler) => {
                if (!this.checkExtensionOwnership(this.currentPlugin, extension)) {
                    console.error(`Plugin "${this.currentPlugin}" is unable to register a page handler, because another plugin already did it!`);
                    return;
                }
                const plug: PluginOwns = this.pluginOwns.get(this.currentPlugin) ?? {};
                if (!plug.fileExtensions) plug.fileExtensions = [];
                if (!plug.fileExtensions.includes(extension)) plug.fileExtensions.push(extension);

                this._builder.setPageHandler(extension, handler);

                this.pluginOwns.set(this.currentPlugin, plug);
            },

            addSsrPageHandler: (extension: string, handler: ssrPageBuildFunction) => {
                if (!this.checkExtensionOwnership(this.currentPlugin, extension)) {
                    console.error(`Plugin "${this.currentPlugin}" is unable to register a SSR page handler, because another plugin already did it!`);
                    return;
                }
                const plug: PluginOwns = this.pluginOwns.get(this.currentPlugin) ?? {};
                if (!plug.fileExtensions) plug.fileExtensions = [];
                if (!plug.fileExtensions.includes(extension)) plug.fileExtensions.push(extension);

                this._builder.setSSRPageHandler(extension, handler);

                this.pluginOwns.set(this.currentPlugin, plug);
            },

            addType: (extension: string, type: TSDeclaration | string, references: {type: "types" | "path", value: string}[] = []) => {
                if (!this.checkExtensionOwnership(this.currentPlugin, extension)) {
                    console.error(`Plugin "${this.currentPlugin}" is unable to register a type declaration, because another plugin already did it!`);
                    return;
                }
                const plug: PluginOwns = this.pluginOwns.get(this.currentPlugin) ?? {};
                if (!plug.fileExtensions) plug.fileExtensions = [];
                if (!plug.fileExtensions.includes(extension)) plug.fileExtensions.push(extension);

                this._builder.setTypeGen(extension, type);
                this._builder.setTypeImports(extension, references);

                this.pluginOwns.set(this.currentPlugin, plug);
            }
        }

        this._builder = new Mediator(this.rootDir, this.ssr);
        this._builder.prepare();
        this._builder.declareTranspilation("ts", "js", tsTranspile);
        this._builder.setPageHandler("html", (_: string, path: string) => {
            const content = readFileSync(path, {"encoding": "utf8"});
            return content;
        });
        this._builder.setSSRPageHandler("html", (_1: string, _2: string, csrHTML: string, ..._: string[]) => {
            return csrHTML;
        });

        traverseDir(normalize(this.rootDir + "/public/"), [this.serveFiles]);
        const serverRoutes = this.serveFiles.filter(i => i.match(/.+\.server\.(js|ts)/) ?? false);
        this.loadServerRoutes(serverRoutes);

        // @ts-ignore it works
        for (const plug of plugins) {
            const { driver } = plug;
            delete plug.driver;
            if (this.checkPluginCompat(plug)) {
                this.registeredPlugins.push(plug.name);
                this.currentPlugin = plug.name;
                driver.call(this);
            } else {
                console.log(`Plugin "${plug.name}" may miss these plugins: ${plug.dependsOn.join(", ")}
Plugin "${plug.name}" may conflict with these plugins: ${plug.conflictsWith.join(", ")}`);
            }
        }

        this._builder.transpile();
        this._builder.toFS();
        this._builder.pageGen();
        this._builder.typeGen();
        const routes = this._builder.pageRouteGen();
        for (const route of routes) {
            if (typeof route.content == "string") {
                // @ts-ignore types
                this.get(route.route, async (_: BuchtaRequest, s: BuchtaResponse) => {
                    s.sendFile(route.path ?? "");
                });

                this.get(route.originalPath, async (_: BuchtaRequest, s: BuchtaResponse) => {
                    s.sendFile(route.path ?? "");
                });
            } else {
                // @ts-ignore types
                this.get(route.route, (r: BuchtaRequest, s: BuchtaResponse) => {
                    // @ts-ignore always
                    let path = decodeURI(r.url.match(/\d(?=\/).+/)[0].slice(1));

                    // @ts-ignore it is a func
                    s.send(route.content(r.originalRoute, path));
                    s.setHeader("Content-Type", "text/html");
                });
            }
        }
    }

    private checkPluginCompat(plug: any): boolean {
        for (const dep of plug.dependsOn ?? []) {
            if (!this.registeredPlugins.includes(dep)) return false;
        }

        for (const conflict of plug.conflictsWith ?? []) {
            if (this.registeredPlugins.includes(conflict)) return false;
        }
        return true;
    }

    private checkExtensionOwnership(plug: string, ext: string): boolean {
        for (const [key, val] of this.pluginOwns) {
            if (plug == key) continue;
            if (val?.fileExtensions?.includes(ext)) return false;
        }

        return true;
    }

    private loadServerRoutes(routes: string[]) {
        for (const route of routes) {
            const mod = require(normalize(this.rootDir + "/public/" + route));
            if (!mod.default) continue;
            const method = route.split(".").shift();
            if (!method) continue;

            if (["get", "post", "put", "delete"].includes(method ?? "")) {
                const {default: f, before: b, after: a} = mod;

                this[method](dirname(route), f);

                if (b) this.router.addBefore(dirname(route), method, b, true);
                if (a) this.router.addAfter(dirname(route), method, a, true);
            }
        }
    }

    run(port: number = this.port, func?: () => void) {
        Bun.serve({
            fetch: async (req: BuchtaRequest): Promise<Response> => {
                // @ts-ignore it works always
                let path = decodeURI(req.url.match(/\d(?=\/).+/)[0].slice(1));
                let route: any;

                if (!path.includes("?")) {
                    route = this.router.handle(path, req.method.toLowerCase());
                } else {
                    const splited = path.split("?");

                    route = this.router.handle(splited[0], req.method.toLowerCase());
                    req.query = this.parseQuery(splited[1]);
                }
                if (!route) return new Response("404", {status: 404});

                req.params = this.router.params;
                req.originalRoute = route.path;

                const buchtaRes = new BuchtaResponse();

                let res: any;

                res = route.b?.(req, buchtaRes);
                if (res?.then) await res;

                if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()

                res = route.f(req, buchtaRes);
                if (res?.then) await res;

                if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()
                
                res = route.a?.(req, buchtaRes);
                if (res?.then) await res;

                if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()
                               
                return await buchtaRes.buildResponse();
            },
            port
        });

        func?.();
    }
    
    parseQuery(path: string) {
        const query = new Map<string, string>();
        const splited = path.split("&");
        splited.forEach(part => {
            const spaced = part.split("=");
            if (!query.has(spaced[0]))
                query.set(spaced[0], spaced[1]);
        })

        return query;
    }
}

new Buchta().run(3000, () => console.log("running"));
