import { route } from "./router";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { Buchta } from "./buchta";

export class BuchtaSubrouter {
    private data: any = [];

    get: route;
    post: route;
    put: route;
    delete: route;

    constructor() {
        let methods = ["get", "post", "put", "delete"];
        for (let method of methods) {
            this[method] = (path: string, handler: (req: BuchtaRequest, res: BuchtaResponse) => void) => {
                this.data.push([method, this.healRoute(path), handler]);
            };
        }
    }

    healRoute(path: string) {
        if (path.endsWith("/"))
            path = path.slice(0, path.length - 1);

        return path;
    }

    putInto(app: Buchta, path: string) {
        path = this.healRoute(path);

        for (const route of this.data) {
            const method = route[0];
            const pth = route[1];
            const func = route[2];
            
            app[method](path + pth, func);
        }
    }
}