import { Context, Elysia } from "elysia";
import { cors } from '@elysiajs/cors'
import { Buchta } from "./src/buchta";
import { CustomBundle } from "./src/bundleToolGen";
import { BuchtaLogger } from "./src/utils/logger";

const buchta = (a: Elysia) => {
    a.use(cors());
    const buchta = new Buchta(true);
    buchta.attachToBundler((b: CustomBundle) => {
        const path = b.relativeImport(Bun.main);
        b.imports.push(`import { edenTreaty } from '@elysiajs/eden'\n`);
        b.imports.push(`import type { App } from '${path}'\n`);
        b.content += `globalThis.eden = edenTreaty<App>('http://localhost:${app.server?.port}')`
    });

    buchta.setup().then(buchta => {
        for (const route of buchta.pages) {
            if (typeof route.content == "string") {
                a.get(route.route, () => Bun.file(route.path ?? ""));

                if (!route.originalPath) continue;
                a.get(route.originalPath, () => Bun.file(route.path ?? ""));
            } else {
                a.get(route.route + "/", (ctx: Context) => {
                    // @ts-ignore always
                    let path = decodeURI(ctx.request.url.match(/\d(?=\/).+/)[0].slice(1));
                    ctx.set.headers["Content-Type"] = "text/html";
                    return route.content(route.route, path);
                })
            }
        }

        const logger = BuchtaLogger(false);

        logger("Buchta is running on top of elysia!", "info");
    });
    return a;
}

const app = new Elysia().
    get("/", () => "Hello").
    listen(3000);

// INFO: must be used after!
app.use(buchta);

// WARN: DO NOT CHANGE THIS!
export type App = typeof app;
