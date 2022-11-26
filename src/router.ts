import { BuchtaRequest } from './request';
import { BuchtaResponse } from './response';

export type route = (path: string, callback: (req: BuchtaRequest, res: BuchtaResponse) => void) => route;

export class Router {
    routes: Map<string, (req: BuchtaRequest, res: BuchtaResponse) => void> = new Map();
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
                let regex = `${method}/${path}`;
                path.split("/").forEach((part, i) => {
                    if (part.startsWith(":")) {
                        const map = this.preParams.get(regex) || new Map();
                        map.set(part.substring(1), i);
                        this.preParams.set(regex, map);
                    }
                })
                this.routes.set(regex, handler);
            };
        }
    }

    private healRoute(path: string) {
        if (!path.endsWith("/")) {
            path += "/";
        }
        return path;
    }

    handle(path: string, method: string): (req: BuchtaRequest, res: BuchtaResponse) => void {
        path = this.healRoute(path);
        for (const [route, handler] of this.routes) {
            const routeParts = route.split("/");
            const pathParts = `${method}/${path}`.split("/");
            if (routeParts.length != pathParts.length) {
                continue;
            }
            const map = this.preParams.get(route);
            if (!map) return handler;
            this.params.clear();
            for (const [key, val] of map) {
                this.params.set(key, pathParts[val + 1]);
            }
            return handler;
        }
    }
}
