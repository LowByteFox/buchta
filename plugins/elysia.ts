import { Buchta } from "../src/buchta.js";
import { BuchtaCLI } from "../bin/buchta.js";
import { Elysia } from 'elysia';
import { BuchtaResponse } from "../src/response.js";
import { BuchtaRequest } from "../src/request.js";

export function elysia() {
    return function (this: Buchta | BuchtaCLI) {
        if (this instanceof Buchta) {
            this.elysia = new Elysia();

            const methods = ["get", "post", "put", "delete"];
            const parseQuery = (path: string) => {
                const query = new Map<string, string>();
                const splited = path.split("&");
                splited.forEach(part => {
                    const spaced = part.split("=");
                    if (!query.has(spaced[0]))
                        query.set(spaced[0], spaced[1]);
                })

                return query;
            }
            console.log("Buchta has eaten elysia")

            for (const method of methods) {
                this[method] = (path: string, handler: (req: any, res: any) => void, ...data: any) => {

                    if (handler.constructor.name == "AsyncFunction") {
                        // @ts-ignore it is
                        this.elysia[method](path, async (ctx: any) => {
                            // @ts-ignore it will
                            const buchtaReq: BuchtaRequest = new Request(ctx.request);
                            const buchtaRes: BuchtaResponse = new BuchtaResponse();

                            buchtaReq.originalRoute = path;
                            buchtaReq.params = new Map(Object.entries(ctx.params));

                            await handler(buchtaReq, buchtaRes);

                            if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()

                            return await buchtaRes.buildResponse();
                        });
                    } else {
                        // @ts-ignore it is
                        this.elysia[method](path, (ctx: any) => {
                            // @ts-ignore it will
                            const buchtaReq: BuchtaRequest = new Request(ctx.request);
                            const buchtaRes: BuchtaResponse = new BuchtaResponse();

                            buchtaReq.originalRoute = path;
                            buchtaReq.params = new Map(Object.entries(ctx.params));

                            handler(buchtaReq, buchtaRes);

                            if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()

                            return buchtaRes.buildResponseSync();
                        });
                    }
                }
            }

            // @ts-ignore psst
            this.router.addBefore = (...args) => { }
            // @ts-ignore psst
            this.router.addAfter = (...args) => { }

            // @ts-ignore psst
            this.run = (serverPort: number = 3000, func?: Function, server = this) => {
                // @ts-ignore psst
                this.elysia.listen(serverPort);
            }
        }
    }
}
