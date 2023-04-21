import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaRouter } from "./router.js";

export default function(port: number, routes: any[]) {
    const router = new BuchtaRouter();

    for (const route of routes) {
        if (typeof route.content == "string") {
            // @ts-ignore types
            router.get(route.route, async (_: BuchtaRequest, s: BuchtaResponse) => {
                s.sendFile(route.path ?? "");
            });

            if (!route.originalPath) continue;
            router.get(route.originalPath, async (_: BuchtaRequest, s: BuchtaResponse) => {
                s.sendFile(route.path ?? "");
            });
        } else {
            // @ts-ignore types
            router.get(route.route, (r: BuchtaRequest, s: BuchtaResponse) => {
                // @ts-ignore always
                let path = decodeURI(r.url.match(/\d(?=\/).+/)[0].slice(1));

                // @ts-ignore it is a func
                s.send(route.content(r.originalRoute, path));
                s.setHeader("Content-Type", "text/html");
            });
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
