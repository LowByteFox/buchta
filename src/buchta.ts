import { Router, route } from "./router";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";

import { readdir } from "fs/promises";
import { resolve } from "path";
import { BuchtaBundler } from "./bundler";

export class Buchta {
    [x: string]: any;
    private router: Router;
    private config: any;
    bundler: BuchtaBundler;
    port: number;
    private afterRouting: Array<Function> = new Array();
    private fextHandlers: Map<string, Function> = new Map();
    private wsOpen: Array<Function> = new Array();
    private wsMessage: Array<Function> = new Array();
    private wsClose: Array<Function> = new Array();
    enableWs = false;

    get: route;
    post: route;
    put: route;
    delete: route;

    constructor() {
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
            this.config = require(process.cwd() + "/buchta.config.ts").default;
        } catch (e) { }

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
                if (!this.config.rootDirectory) return;
                const root = this.config.rootDirectory;
                const files = await this.getFiles(root);
                const methods = ["get", "post", "put", "delete"];
                this.bundler = new BuchtaBundler(this.config.rootDirectory);
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
                        const filename = splited.join(".").split("/").pop();
                        const start = filename.split(".").shift();
                        const method = methods.find(m => m == start);
                        if (method) {
                            const temp = splited.join(".").split("/");
                            temp.pop();
                            const module = await import(file);

                            this[method](temp.join("/"), async (req, res) => {
                                module.default(req, res);
                            }, module.data);
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
                this.bundler.bundle();
                this.bundler.build(this);
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
     * @param {number} [serverPort=3000] - port on which will the server run
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
                message: (ws: WebSocket, msg: String) => {
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
                const routeFunc = server.router.handle(temp.pathname, req.method.toLowerCase());
                req.params = server.router.params;
                req.query = temp.searchParams;
                const buchtaRes = new BuchtaResponse();
                if (routeFunc) {
                    if (routeFunc.constructor.name == "AsyncFunction")
                        await routeFunc(req, buchtaRes);
                    else
                        routeFunc(req, buchtaRes);
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
