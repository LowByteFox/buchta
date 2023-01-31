import { Router, route } from "./router";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaBundler } from "./bundler";

import { readdir } from "fs/promises";
import { basename, dirname, resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { BuchtaSubrouter } from "./subrouter";
import { colors, customLog } from "./colors";
import { fswatch } from "./fswatch";

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

    constructor(config?: any) {
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
            this.config = config ?? require(process.cwd() + "/buchta.config.ts").default;
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
        
        (async (methods) => {
            await this.autoLoad(methods);
        })(methods);
    }

    async autoLoad(methods) {
        if (this.config) {
            if (!this.config.rootDirectory) return;
            const rootDir = this.config.rootDirectory + "/public";
            const rootDirFiles = await this.getFiles(rootDir);
            this.bundler = new BuchtaBundler(rootDir);
            this.bundler.prepare();
            rootDirFiles.forEach(async file => {
                const route = file.substring(rootDir.length).replace("[", ":").replace("]", "");
                const shortenedFile  = basename(route);
                await this.handleFile(shortenedFile, route, file, methods);
                if (this.livereload) {
                    fswatch(file, null, async () => {
                        await this.handleFile(shortenedFile, route, file, methods);
                        this.bundler.bundle(true);
                        this.bundler.build(this, true);
                        
                        this.livereload.clients.forEach(client => {
                            client.send("YEEET!");
                        })
                    });
                }
            });

            this.bundler.bundle();
            this.bundler.build(this);

            const templateDir = `${this.config.rootDirectory}/templates`;
            if (existsSync(templateDir)) {
                const templateDirFiles = await this.getFiles(templateDir);
                templateDirFiles.forEach(template => {
                    const file = template.slice(templateDir.length + 1);
                    this.templater.set(file, readFileSync(template, {encoding: "utf-8"}));
                })
            }

            await this.handleMiddlewares(this.config.rootDirectory + "/middleware", methods);
            await this.handleStaticFiles(this.config.rootDirectory + "/static");
        }
    }

    async handleMiddlewares(path: string, methods: string[]) {
        if (!existsSync(path)) return;
        const files = await this.getFiles(path);

        files.forEach(async file => {
            const route = dirname(file.slice(path.length));

            const module = await import(file);

            methods.forEach(method => {
                if (module.before) this.router.addBefore(route, method, module.before, false);
                if (module.after) this.router.addAfter(route, method, module.after, false);
            })
        })
    }

    async handleStaticFiles(path: string) {
        if (!existsSync(path)) return;
        const files = await this.getFiles(path);

        files.forEach(file => {
            const route = file.slice(path.length);
            
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.sendFile(file);
            });
        })
    }

    async handleFile(filename: string, route: string, path: string, methods: string[]) {
        const routeIndex = this.config?.routes?.fileName || "index";
        const extension = filename.split(".").pop();
        if (filename.startsWith(routeIndex) && filename.endsWith(".html")) {
            if (this.livereload) {
                let content = readFileSync(path, {encoding: "utf-8"});
                content += `
                <script>
                let socket = new WebSocket("ws://localhost:${this.getPort()}");

                socket.onmessage = (e) => { if (e.data == "YEEET!") window.location.reload(); }
                </script>
                `;

                this.get(dirname(route), (_req, res) => {
                    res.send(content);
                    res.setHeader("content-type", "text/html");
                });
            } else {
                this.get(dirname(route), (_req, res) => {
                    res.sendFile(path);
                });
            }
        } else if (filename.endsWith(".js") || filename.endsWith(".ts")) {
            if (filename.match(/.+\.server\.(ts|js)/)) {
                await this.handleServerFunction(filename, path, methods, route);
            } else {
                if (filename.startsWith("middleware")) {
                    this.WARN(`File 'public${route}' should be in 'middleware' directory, ignoring`);
                    return;
                }

                this.bundler.addFile(path);
                this.get(route, (_req, res) => {
                    res.sendFile(path);
                });
            }
        } else {
            if (this.fextHandlers.has(extension)) {
                this.fextHandlers.get(extension)?.(route, path);
            } else {
                this.WARN(`File 'public${route}' should be in 'static' directory\n`);
                this.get(route, (_req, res) => {
                    res.sendFile(path);
                });
            }
        }
    }

    private WARN(str: string) {
        customLog([colors.bold, colors.white], "[ ");
        customLog([colors.bold, colors.yellow], "WARN");
        customLog([colors.bold, colors.white], " ]: ");
        customLog([colors.bold, colors.white], str);
    }

    async handleServerFunction(filename: string, path: string, methods: string[], route: string) {
        const firstPart = filename.split(".").shift();
        const method = methods.find(m => m == firstPart);
        if (method) {
            const module = await import(path);
            if (!module.default) return;

            const func = module?.default;

            if (func.constructor.name == "AsyncFunction") {
                this[method](dirname(route), async (req: BuchtaRequest, res: BuchtaRequest) => {
                    await func(req, res);
                });
            } else {
                this[method](dirname(route), (req: BuchtaRequest, res: BuchtaResponse) => {
                    func(req, res);
                });
            }

            if (module.before) {
                this.router.addBefore(dirname(route), method, module.before, true);
            }

            if (module.after) {
                this.router.addAfter(dirname(route), method, module.after, true);
            }
        }
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
    wsOnMessage(func: (ws: WebSocket, msg: string) => void) {
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

    use(path: string, router: BuchtaSubrouter) {
        router.putInto(this, path);       
    }

    /**
     * Run the server
     * @param {number} [serverPort=3000] - p    ort on which will the server run
     * @param {Function} [func=undefined] - function that will run after the server has started
     */
    run = (serverPort: number = 3000, func?: Function, server = this) => {
        server.port = this.config?.port || serverPort;

        let ws = {
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

        Bun.serve({
            // @ts-ignore wsServer bun-types issues
            async fetch(req: BuchtaRequest, wsServer: any = null): Promise<Response> {
                if (wsServer?.upgrade(req)) return;
                
                let path = decodeURI(req.url.match(/\d(?=\/).+/)[0].slice(1));
                let route;

                if (!path.includes("?")) {
                    route = server.router.handle(path, req.method.toLowerCase());
                } else {
                    const splited = path.split("?");

                    route = server.router.handle(splited[0], req.method.toLowerCase());
                    req.query = server.parseQuery(splited[1]);
                }
                
                if (!route)
                    return new Response("404");
                req.params = server.router.params;

                const buchtaRes = new BuchtaResponse();

                let res: any;

                res = route.b?.(req, buchtaRes);
                if (res?.then) await res;

                res = route.f(req, buchtaRes);
                if (res?.then) await res;

                res = route.a?.(req, buchtaRes);
                if (res?.then) await res;

                return buchtaRes.buildResponse();
            },
            port: serverPort,
            development: true,
            // @ts-ignore bun-ws missing types
            websocket: ws
        });
        console.log(`Buchta entered oven and met Bun. Both of them started talking about HTTP on port ${serverPort}`);
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

export function get_version() {
    return "0.4.3";
}