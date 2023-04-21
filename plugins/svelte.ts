import { readFileSync, writeFileSync } from "fs";
import { basename } from "path";
import { compile } from "svelte/compiler";
import { Buchta, BuchtaPlugin } from "../src/buchta.js";

export function svelte(): BuchtaPlugin {

    const tsTranspiler = new Bun.Transpiler({loader: "ts"});

    function svelteTranspile(_: string, path: string) {
        let content = readFileSync(path, {encoding: "utf8"});

        const scriptCode = content.match(/.(?<=<script.+lang="ts".*>.).+(?=<\/script>)/s);
        if (scriptCode) { 
            const code = tsTranspiler.transformSync(scriptCode[0], {});
            content = content.replace(scriptCode[0], code);
        }

        const { js } = compile(content, {
            // @ts-ignore types
            generate: globalThis.__BUCHTA_SSR ? "ssr" : "dom",
            hydratable: true,
        });

        return js.code;
    }

    function sveltePage(route: string, path: string) {
        const content = readFileSync(path, {encoding: "utf8"});
        const split = content.split("\n");
        split.pop();
        split.push("new Component({ target: document.body, hydrate: true });");
        writeFileSync(path, split.join("\n"));

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body>
<!-- HTML -->
</body>
<script type="module" src="./${basename(route)}"></script>
</html>`
    }

    function svelteSSRPage(_originalRoute: string, _route: string, csrHTML: string, modFile: string) {
        const mod = require(modFile).default;

        return csrHTML.replace("<!-- HTML -->", mod.render().html);
    }

    return {
        name: "svelte",
        version: "0.1",
        dependsOn: [],
        conflictsWith: [],
        driver(this: Buchta) {
            this.builder.addTranspiler("svelte", "js", svelteTranspile);
            this.builder.addPageHandler("svelte", sveltePage);
            if (this.ssr) {
                this.builder.addSsrPageHandler("svelte", svelteSSRPage);
            }
        }
    }
}
