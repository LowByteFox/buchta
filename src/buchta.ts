import { Router, route } from "./router";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaBundler } from "./bundler";

import { readdir } from "fs/promises";
import { basename, dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";

export class Buchta {
    [x: string]: any;
    private router: Router;
    private templater = new Map<string, string>();
    private config: any;
    bundler: BuchtaBundler;
    port: number;
    private afterRouting: Array<Function> = new Array();
    private fextHandlers: Map<string, Function> = new Map();
    private wsOpen: Array<Function> = new Array();
    private wsMessage: Array<Function> = new Array();
    private wsClose: Array<Function> = new Array();
    enableWs = true;

    get: route;
    post: route;
    put: route;
    delete: route;

    constructor(options: { config?: any }) {
        this.router = new Router();
        const methods = ["get", "post", "put", "delete"];
        for (const method of methods) {
            this[method] = (path: string, handler: (req: BuchtaRequest, res: BuchtaResponse) => void, data: any) => {
                this.router[method](path, handler);
                if (data) {
                    for (const func of this.afterRouting) {
                        func.call(this, {
                            data,
                            method,
                            path,
                        });
                    }
                }
            };
        }

        try {
            // https://discord.com/channels/876711213126520882/876711213126520885/1068212765539442818
            this.config = require(process.cwd() + "/buchta.config.ts").default;
        } catch (e) {
            console.log(e);
        }

        if (this.config?.ws?.enable) {
            this.enableWs = this.config.ws.enable;
        }

        if (this.config?.plugins) {
            for (const plugin of this.config.plugins) {
                this.mixInto(plugin);
            }
        }

        (async () => {
            if (this.config) {
                const mids = [];
                if (!this.config.rootDirectory) return;
                const root = `${this.config.rootDirectory}/public`;
                const files = await this.getFiles(root);
                const methods = ["get", "post", "put", "delete"];
                this.bundler = new BuchtaBundler(root);
                this.bundler.prepare();
                for (const file of files) {
                    const route = file.substring(root.length).replace("[", ":").replace("]", "");
                    const splited = route.split(".");
                    const base = splited[0];
                    const ext = splited[splited.length - 1];
                    const ending = this.config.routes?.fileName || "index";
                    if (base.endsWith(ending) && ext == "html") {
                        this.get(base.substring(0, base.length - ending.length), (req, res) => {
                            res.sendFile(file);
                        });
                    } else if (ext == "js" || ext == "ts") {
                        const filename = basename(route);
                        const start = filename.split(".").shift();
                        const method = methods.find(m => m == start);
                        if (method) {
                            const temp = splited.join(".").split("/");
                            temp.pop();
                            const module = await import(file);

                            this[method](temp.join("/"), async (req, res) => {
                                if (module.default.constructor.name == "AsyncFunction")
                                    await module.default(req, res);
                                else
                                    module.default(req, res);
                            }, module.data);

                            if (module.before) {
                                this.router.addBefore(dirname(route), method, module.before, true);
                            }
                            if (module.after) {
                                this.router.addAfter(dirname(route), method, module.after, true);
                            }

                        } else if (filename.startsWith("middleware")) {
                            mids.push([file, route]);
                        } else {
                            this.bundler.addFile(file);
                            if (this.fextHandlers.has(ext)) {
                                this.fextHandlers.get(ext)?.(route, file);
                            } else {
                                this.get(route, (_req, res) => {
                                    res.sendFile(file);
                                });
                            }
                        }
                    } else {
                        if (this.fextHandlers.has(ext)) {
                            this.fextHandlers.get(ext)?.(route, file);
                        } else {
                            this.get(route, (_req, res) => {
                                res.sendFile(file);
                            });
                        }
                    }
                }

                for (const element of mids) {
                    const module = await import(element[0]);
                    methods.forEach(m => {
                        if (module.before) {
                            this.router.addBefore(dirname(element[1]), m, module.before, false);
                        }
                        if (module.after) {
                            this.router.addAfter(dirname(element[1]), m, module.after, false);
                        }
                    });
                }

                this.bundler.bundle();
                this.bundler.build(this);
            }

            const templateDir = `${this.config.rootDirectory}/templates`;
            if (existsSync(templateDir)) {
                const templates = await this.getFiles(templateDir);
                templates.forEach(template => {
                    const file = template.replace(templateDir, "").slice(1);
                    this.templater.set(file, readFileSync(template, {encoding: "utf-8"}));
                });
            }
        })();
    }

    /**
     * Add a callback that will get executed after the route has been registered
     * @param {Function} callback - The function
     */
    assignAfterRouting(callback: Function) {
        this.afterRouting.push(callback);
    }

    /**
     * Add a callback that will get executed when FS routing detects specified extension
     * @param {string} ext - File extension
     * @param {Function} callback - The function
     */
    assignExtHandler(ext: string, callback: Function) {
        this.fextHandlers.set(ext, callback);
    }

    /**
     * Get template that can be used in plugin
     * @param {string} name - name of file, for example `svelte.html`
     * Returns content of `name` template stored in `templates` directory
     */
    getTemplate(name: string) {
        return this.templater.get(name);
    }

    /**
     * Returns fileName used for / routing: /index.html -> / ( index )
     */
    getDefaultFileName() {
        return this.config.routes.fileName;
    }

    private async getFiles(dir: string) {
        const dirents = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = resolve(dir, dirent.name);
            return dirent.isDirectory() ? this.getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    }

    /**
     * Adds plugin made for Buchta
     * @param {Function} plugin - Function returned by plugin
     */
    mixInto(plugin: Function) {
        plugin.call(this);
    }

    /**
     * Returns root directory path
     */
    getRoot() {
        return this.config.rootDirectory;
    }

    /**
     * Returns port used for server
     */
    getPort() {
        return this.config.port;
    }

    /**
     * Add function that will be trigerred when websockets recieves message
     * @param {(ws: WebSocket, msg: String) => void} func - the function
     */
    wsOnMessage(func: (ws: WebSocket, msg: String) => void) {
        this.wsMessage.push(func);
    }

    /**
     * Add function that will be trigerred when client connects to websocket server
     * @param {(ws: WebSocket) => void} func - the function
     */
    wsOnOpen(func: (ws: WebSocket) => void) {
        this.wsOpen.push(func);
    }

    /**
     * Add function that will be trigerred when client disconnects to websocket server
     * @param {(ws: WebSocket) => void} func - the function
     */
    wsOnClose(func: (ws: WebSocket) => void) {
        this.wsClose.push(func);
    }

    /**
     * Run the server
     * @param {number} [serverPort=3000] - p    ort on which will the server run
     * @param {Function} [func=undefined] - function that will run after the server has started
     */
    run = (serverPort: number = 3000, func?: Function, server = this) => {
        server.port = serverPort;
        if (this.config?.port) {
            serverPort = this.config.port;
            server.port = serverPort;
        }
        let ws: any;
        if (!this.enableWs) {
            ws = null;
        } else {
            ws = {
                open: (ws: WebSocket) => {
                    for (const fun of this.wsOpen) {
                        fun(ws);
                    }
                },
                message: (ws: WebSocket, msg: string) => {
                    for (const fun of this.wsMessage) {
                        fun(ws, msg);
                    }
                },
                close: (ws: WebSocket) => {
                    for (const fun of this.wsClose) {
                        fun(ws);
                    }
                }
            };
        }

        Bun.serve({
            // @ts-ignore wsServer bun-types issues
            async fetch(req: BuchtaRequest, wsServer: any = null): Promise<Response> {
                if (wsServer?.upgrade(req)) return;
                const temp = new URL(req.url);
                const route = server.router.handle(temp.pathname, req.method.toLowerCase());
                if (!route) return new Response("404");
                const routeFunc = route.f;
                req.params = server.router.params;
                req.query = temp.searchParams;
                const buchtaRes = new BuchtaResponse();

                if (routeFunc) {
                    let res;

                    if (route.b) {
                        res = route.b(req, buchtaRes);
                        if (res?.then) await res;
                    }

                    res = routeFunc(req, buchtaRes);
                    if (res?.then) await res;

                    if (route.a) {
                        res = route.a(req, buchtaRes);
                        if (res?.then) await res;
                    }

                    return buchtaRes.buildResponse();
                }
                return new Response("404\n");
            },
            port: serverPort,
            development: true,
            // @ts-ignore bun-ws missing types
            websocket: ws
        });
        console.log(`Buchta entered oven and met Bun. Both of them started talking about HTTP on port ${serverPort}`);
        func?.();
    }
}

export function get_version() {
    return "0.4.3";
}