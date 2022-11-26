import { Router, route } from "./router";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";

export class Buchta {
    router: Router;

    get: route;
    post: route;
    put: route;
    delete: route;

    constructor() {
        this.router = new Router();
        const methods = ["get", "post", "put", "delete"];
        for (const method of methods) {
            this[method] = (path: string, handler: (req: BuchtaRequest, res: BuchtaResponse) => void) => {
                this.router[method](path, handler);
            };
        }
    }

    run = (serverPort: number = 3000, func?: Function, server = this) => {
        Bun.serve({
            async fetch(req: BuchtaRequest) : Promise<Response> {
                const temp = new URL(req.url);
                const routeFunc = server.router.handle(temp.pathname, req.method.toLowerCase());
                req.params = server.router.params;
                req.query = temp.searchParams;
                if (routeFunc) {
                    const buchtaRes = new BuchtaResponse("./");
                    if (routeFunc.constructor.name == "AsyncFunction")
                        await routeFunc(req, buchtaRes);
                    else
                        routeFunc(req, buchtaRes);
                    return buchtaRes.buildResponse();
                }
                return new Response("404");
            },
            port: serverPort,
            development: true
        });
        console.log(`Buchta entered oven and met Bun. Both of them started talking about HTTP on port ${serverPort}`);
        func?.();
    }
}
