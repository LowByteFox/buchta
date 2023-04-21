import { Context, Elysia } from "elysia";
import { cors } from '@elysiajs/cors'
import { Buchta } from "./src/buchta";
import { CustomBundle } from "./src/bundleToolGen";
import { BuchtaLogger } from "./src/utils/logger";
import { normalize, relative } from "path";

const buchta = (a: Elysia) => {
    a.use(cors());
    const buchta = new Buchta(true);
    buchta.attachToBundler((b: CustomBundle) => {
        const path = b.relativeImport(Bun.main);
        b.imports.push(`import { edenTreaty } from '@elysiajs/eden'\n`);
        b.imports.push(`import type { App } from '${path}'\n`);
        b.content += `globalThis.eden = edenTreaty<App>('http://localhost:${app.server?.port}')`
    });

    buchta.builder.globalDeclarations.push({
        id: "const",
        name: "eden",
        type: "edenTreaty<App>",
    })

    const path = relative(normalize(buchta.rootDir + "/.buchta/"), Bun.main);

    buchta.builder.imports.push(`import type { App } from "${path}"`)

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
    get("/api/hey", () => "Hello").
    post("/api/bun", () => "Bun").
    listen(3000);

console.log(`🦊 Elysia is running at ${app.server.hostname}:${app.server.port}`)

// INFO: must be used after!
app.use(buchta);

// WARN: DO NOT CHANGE THIS!
export type App = typeof app;
