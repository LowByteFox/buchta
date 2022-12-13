import { Router, route } from "./router";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";

import { readdir } from "fs/promises";
import { resolve } from "path";

export class Buchta {
    [x: string]: any;
    router: Router;
    private config: any;
    port: number;
    private afterRouting: Array<Function> = new Array();
    fextHandlers: Map<string, Function> = new Map();

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

        if (this.config?.plugins) {
            for (const plugin of this.config.plugins) {
                this.mixInto(plugin());
            }
        }

        (async () => {
            if (this.config) {
                if (!this.config.rootDirectory) return;
                const root = this.config.rootDirectory;
                const files = await this.getFiles(root);
                const methods = ["get", "post", "put", "delete"];
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
            }
        })();
    }

    assingAfterRouting(callback: Function) {
        this.afterRouting.push(callback);
    }

    private async getFiles(dir: string) {
        const dirents = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = resolve(dir, dirent.name);
            return dirent.isDirectory() ? this.getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    }

    mixInto(plugin: any) {
        plugin.call(this);
    }

    run = (serverPort: number = 3000, func?: Function, server = this) => {
        server.port = serverPort;
        if (this.config.port) {
            serverPort = this.config.port;
            server.port = serverPort;
        }
        Bun.serve({
            async fetch(req: BuchtaRequest): Promise<Response> {
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
            development: true
        });
        console.log(`Buchta entered oven and met Bun. Both of them started talking about HTTP on port ${serverPort}`);
        func?.();
    }
}
