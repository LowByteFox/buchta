// "Sometimes, you have to be cruel to be kind." - Kel
import { routeChain } from "./router.js";
import { BuchtaRequest } from "./request.js";
import { BuchtaResponse } from "./response.js";

export class BuchtaSubrouter {
    [x: string]: any;

    private data: any = [];

    // @ts-ignore it does
    get: routeChain;
    // @ts-ignore it does
    post: routeChain;
    // @ts-ignore it does
    put: routeChain;
    // @ts-ignore it does
    delete: routeChain;

    constructor() {
        let methods = ["get", "post", "put", "delete"];
        for (let method of methods) {
            this[method] = (path: string, handler: (req: BuchtaRequest, res: BuchtaResponse) => BuchtaSubrouter) => {
                this.data.push([method, this.healRoute(path), handler]);
                return this;
            };
        }
    }

    healRoute(path: string) {
        if (path.endsWith("/"))
            path = path.slice(0, path.length - 1);

        return path;
    }

    // WARN: must be fixed
    //
    // @ts-ignore later
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
