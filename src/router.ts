import { BuchtaRequest } from './request';
import { BuchtaResponse } from './response';

export type route = (path: string, callback: (req: BuchtaRequest, res: BuchtaResponse) => void, ...data) => void;

interface BuchtaRoute {
    b: (req: BuchtaRequest, res: BuchtaResponse) => void,
    f: (req: BuchtaRequest, res: BuchtaResponse) => void,
    a: (req: BuchtaRequest, res: BuchtaResponse) => void,
}

export class Router {
    routes: Map<string, BuchtaRoute> = new Map();
    preParams: Map<string, Map<string, number>> = new Map();
    params: Map<string, string> = new Map();

    get: route;
    post: route;
    put: route;
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

    addBefore(route: string, method: string, callback: (req: BuchtaRequest, res: BuchtaResponse) => void, force: boolean) {
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

    addAfter(route: string, method: string, callback: (req: BuchtaRequest, res: BuchtaResponse) => void, force: boolean) {
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

    handle(path: string, method: string): BuchtaRoute {
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
