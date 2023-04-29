import { readFileSync } from "node:fs";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaRouter } from "./router.js";
import { Buchta } from "./buchta";
import { basename } from "node:path";

const nameGen = (length: number) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}


const renameFile = (path: string, toAdd: string) => {
    const split = path.split(".");
    const ext = split.pop();
    // @ts-ignore only files will go
    return `${split.join(".")}-${toAdd}.${ext}`
}

export default function(build: Buchta, port: number, routes: any[]) {
    const router = new BuchtaRouter();

    for (const route of routes) {
        if (typeof route.content == "string" || route.content instanceof Buffer) {
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

    build.on("fileLoad", (data) => {
        data.route = "/" + renameFile(basename(data.path), nameGen(7));
        const func = async (_: BuchtaRequest, s: BuchtaResponse) => {
            s.sendFile(data.path ?? "");
        }

        router.get(data.path, func);

        if (data.path.includes(".buchta/output-ssr")) {
            const temp = data.path.replace(".buchta/output-ssr/", ".buchta/output/");
            router.get(temp, func);
        }
    })

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
