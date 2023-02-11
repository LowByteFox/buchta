import { readFileSync } from "fs";

export interface BuchtickaRequest extends Request {
    params: any;
    query: any;
}

export class BuchtickaResponse {
    private statusCode: number;
    private headers: Headers;
    private statusText: string;
    private body: string | Uint8Array;
    private filePath: string;

    constructor() {
        this.statusCode = 200;
        this.headers = new Headers();
        this.statusText = "";
        this.body = "";
        this.filePath = null;
    }

    setHeader(name: string, value: string) {
        this.headers.set(name, value);
    }

    send(body: string) {
        this.body = body;
    }

    sendJson(json: any) {
        this.setHeader("Content-Type", "application/json");
        this.body = JSON.stringify(json);
    }

    sendFile(filePath: string) {
        this.filePath = filePath;
    }

    setStatus(statusCode: number) {
        this.statusCode = statusCode;
    }

    setStatusText(statusText: string) {
        this.statusText = statusText;
    }

    buildResponse() {
        if (this.filePath)
            return new Response(readFileSync(this.filePath), {
                status: this.statusCode,
                statusText: this.statusText,
                headers: this.headers,
            });
            
        return new Response(this.body, {
            status: this.statusCode,
            statusText: this.statusText,
            headers: this.headers,
        });
    }
}

type route = (path: string, callback: (req: BuchtickaRequest, res: BuchtickaResponse) => void, ...data) => void;

interface BuchtickaRoute {
    b: (req: BuchtickaRequest, res: BuchtickaResponse) => void,
    f: (req: BuchtickaRequest, res: BuchtickaResponse) => void,
    a: (req: BuchtickaRequest, res: BuchtickaResponse) => void,
}

class BuchtickaRouter {
    routes: Map<string, BuchtickaRoute> = new Map();
    preParams: Map<string, Map<string, number>> = new Map();
    params: Map<string, string> = new Map();

    get: route;
    post: route;
    put: route;
    delete: route;

    constructor() {
        let methods = ["get", "post", "put", "delete"];
        for (let method of methods) {
            this[method] = (path: string, handler: (req: BuchtickaRequest, res: BuchtickaResponse) => void) => {
                let regex = `${method}/${this.healRoute(path)}`;
                path.split("/").forEach((part, i) => {
                    if (part.startsWith(":")) {
                        const map = this.preParams.get(regex) || new Map();
                        map.set(part.substring(1), i);
                        this.preParams.set(regex, map);
                    }
                })
                this.routes.set(regex, {a: null, b: null, f: handler});
            };
        }
    }

    private healRoute(path: string) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        return path;
    }

    addBefore(route: string, method: string, callback: (req: BuchtickaRequest, res: BuchtickaResponse) => void, force: boolean) {
        let regex = `${method}/${this.healRoute(route)}`;

        const data = this.routes.get(regex);
        if (!data) return;

        if (data.b && force) {
            data.b = callback;
        }

        if (!data.b) {
            data.b = callback;
        }
    }

    addAfter(route: string, method: string, callback: (req: BuchtickaRequest, res: BuchtickaResponse) => void, force: boolean) {
        let regex = `${method}/${this.healRoute(route)}`;

        const data = this.routes.get(regex);
        if (!data) return;

        if (data.a && force) {
            data.a = callback;
        }

        if (!data.a) {
            data.a = callback;
        }
    }

    handle(path: string, method: string): BuchtickaRoute {
        path = `${method}/${this.healRoute(path)}`;
        for (const [route, handler] of this.routes) {
            const routeParts = route.split("/");
            const pathParts = path.split("/");

            if (routeParts.length != pathParts.length) continue;
            
            if (path.match(route.replace(/:[^\s/]+/, ".+"))) {
                const map = this.preParams.get(route);
                if (!map) return handler;
                this.params.clear();
                for (const [key, val] of map) {
                    this.params.set(key, pathParts[val + 1]);
                }
                return handler;
            }
        }
        return null;
    }
}

export class Buchticka {
    private router: BuchtickaRouter = new BuchtickaRouter();
    private wsOpen: Array<Function> = new Array();
    private wsMessage: Array<Function> = new Array();
    private wsClose: Array<Function> = new Array();

    private afterRouting: Array<Function> = new Array();

    get: route;
    post: route;
    put: route;
    delete: route;

    addBefore(route: string, method: string, callback: (req: BuchtickaRequest, res: BuchtickaResponse) => void, force: boolean) {
        this.router.addBefore(route, method, callback, force)
    }
    addAfter(route: string, method: string, callback: (req: BuchtickaRequest, res: BuchtickaResponse) => void, force: boolean) {
        this.router.addAfter(route, method, callback, force)
    }

    constructor() {
        const methods = ["get", "post", "put", "delete"];
        for (const method of methods) {
            this[method] = (path: string, handler: (req: BuchtickaRequest, res: BuchtickaResponse) => void, data: any) => {
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
    }

    run = (serverPort: number = 3000, func?: Function, server = this) => {

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
            async fetch(req: BuchtickaRequest, wsServer: any = null): Promise<Response> {
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
                    return new Response("404", {status: 404});
                req.params = server.router.params;

                const buchtaRes = new BuchtickaResponse();

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
        console.log(`Buchticka entered oven and met Bun. Both of them started talking about HTTP on port ${serverPort}`);
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