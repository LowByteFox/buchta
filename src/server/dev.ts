import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaRouter } from "./router.js";
import { Buchta } from "../buchta.ts";
import { basename, dirname } from "node:path";

const extraRoutes: Map<string, any> = new Map();

export const earlyHook = (build: Buchta) => {
    build.on("fileLoad", (data) => {
        data.route = "/" + basename(data.path);
        const func = async (_: BuchtaRequest, s: BuchtaResponse) => {
            s.sendFile(data.path ?? "");
        }

        extraRoutes.set(data.route, func);
    })
}

export default function(this: Buchta, port: number, routes: any[]) {
    const router = new BuchtaRouter();

    for (const [route, func] of extraRoutes) {
        router.get(route, func);
    }

    for (const route of routes) {
        if (route.func) {
            router.get(dirname(route.route), async(req: BuchtaRequest, res: BuchtaResponse) => {
                // @ts-ignore always
                let path = new URL(req.url).pathname;

                res.send(await route.func(req.originalRoute, path));
                res.setHeader("Content-Type", "text/html");
            });
        } else {
            if (!this.config?.ssr && "html" in route) {
                router.get(dirname(route.route), (req: BuchtaRequest, res: BuchtaResponse) => {
                    res.send(route.html);
                    res.setHeader("Content-Type", "text/html");
                });
            }

            if ("dependencies" in route) {
            }

            if (!("html" in route)) {
                router.get(route.route, (_: any, s: BuchtaResponse) => s.sendFile(route.path));
                router.get(route.originalRoute, (_: any, s: BuchtaResponse) => s.sendFile(route.path));
            }
        }
    }

    function parseQuery(path: string) {
        const query = new Map<string, string>();
        const splited = path.split("&");
        splited.forEach(part => {
            const spaced = part.split("=");
            if (!query.has(spaced[0]))
                query.set(spaced[0], spaced[1]);
        })

        return query;
    }

    Bun.serve({
        fetch: async (req: BuchtaRequest): Promise<Response> => {
            // @ts-ignore never null
            let path = decodeURI(req.url.match(/\d(?=\/).+/)[0].slice(1));
            let route: any;

            if (!path.includes("?")) {
                route = router.handle(path, req.method.toLowerCase());
            } else {
                const splited = path.split("?");

                route = router.handle(splited[0], req.method.toLowerCase());
                req.query = parseQuery(splited[1]);
            }
            if (!route) return new Response("404", {status: 404});

            req.params = router.params;
            req.originalRoute = route.path;

            const buchtaRes = new BuchtaResponse();

            let res: any;

            res = route.b?.(req, buchtaRes);
            if (res?.then) await res;

            if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()

            res = route.f(req, buchtaRes);
            if (res?.then) await res;

            if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()
                
            res = route.a?.(req, buchtaRes);
            if (res?.then) await res;
            if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()
                               
            return buchtaRes.buildResponseSync();
        },
        port: port
    })
}
