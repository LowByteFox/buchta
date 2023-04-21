import { BuchtaRequest } from './request.js';
import { BuchtaResponse } from './response.js';

export type route = (path: string, callback: (req: BuchtaRequest, res: BuchtaResponse) => void) => void;

interface BuchtaRoute {
    f: (req: BuchtaRequest, res: BuchtaResponse) => void,
    path: string,
}

export class BuchtaRouter {
    [x: string]: any;

    routes: Map<string, BuchtaRoute> = new Map();
    preParams: Map<string, Map<string, number>> = new Map();
    params: Map<string, string> = new Map();

    // @ts-ignore it does
    get: route;
    // @ts-ignore it does
    post: route;
    // @ts-ignore it does
    put: route;
    // @ts-ignore it does
    delete: route;

    constructor() {
        let methods = ["get", "post", "put", "delete"];
        for (let method of methods) {
            this[method] = (path: string, handler: (req: BuchtaRequest, res: BuchtaResponse) => void) => {
                let regex = `${method}/${this.healRoute(path)}`;
                path.split("/").forEach((part, i) => {
                    if (part.startsWith(":")) {
                        const map = this.preParams.get(regex) || new Map();
                        map.set(part.substring(1), i);
                        this.preParams.set(regex, map);
                    }
                })
                this.routes.set(regex, {f: handler, path: path});
            };
        }
    }

    private healRoute(path: string) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        return path;
    }

    handle(path: string, method: string): BuchtaRoute | null {
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
