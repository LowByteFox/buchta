import { Buchta } from "../buchta";
import { BuchtaRequest } from "../request";
import { BuchtaResponse } from "../response";

import { compile } from "svelte/compiler";

import { readFileSync } from "fs";

/**
 * Svelte support for Buchta
 * @param {any} compilerOptions - options for the svelte compiler
 */
export function svelte(compilerOptions: any = {}) {

    const opts = compilerOptions;
    const patched: Map<string, Array<string>> = new Map();

    // TODO: Until Buchta v4.3, this function will have to exist to generate html
    // What does it mean? Buchta v4.3 will have `template` directory for this kind of stuff
    const svelteHTML = (code: string) => {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    
</body>
<script type="module">
${code}
new Component({target: document.body});
</script>
</html>
`
    }

    // hides file imports so that the bundler won't get confused
    const hideSvelteImports = (route: string, code: string) => {
        const split: string[] = code.split("\n");
        for (let i = 0; i < split.length; i++) {
            if (split[i].includes("import") && (split[i].includes(".svelte") || split[i].includes(".js"))) {
                if (!patched.has(route)) {
                    patched.set(route, new Array());
                }
                const obj = patched.get(route);
                if (obj)
                    obj.push(split[i]);
                split[i] = `// ${split[i]}`;
            }
        }
        return split.join("\n");
    }

    function patchAfterBundle(this: Buchta, route: string, code: string) {
        if (patched.has(route)) {
            const obj = patched.get(route);
            let before = "";
            if (obj)
                for (const e of obj) {
                    before += `${e}\n`;
                }
            code = `${before}\n${code}`;
        }
        if (route.endsWith(`${this.getDefaultFileName()}.svelte`)) {
            route = route.substring(0, route.length - 7 - this.getDefaultFileName().length);
        }

        if (route.endsWith(".svelte")) {
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(code);
                res.setHeader("Content-Type", "text/javascript");
            });
        } else {
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(svelteHTML(code));
                res.setHeader("Content-Type", "text/html");
            });
        }
    }

    return function (this: Buchta) {
        this.assignExtHandler("svelte", (route: string, file: string) => {
            const content = readFileSync(file, { encoding: "utf-8" });
            const { js } = compile(content, {
                generate: "dom",
                ...opts
            });

            const code = hideSvelteImports(route, js.code);
            this.bundler.addCustomFile(route, `${route.replace("svelte", "js")}`, code);
            this.bundler.addPatch(route, patchAfterBundle);

            if (route.endsWith(".svelte")) {
                this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                    res.send(code);
                    res.setHeader("Content-Type", "text/javascript");
                });
            } else {
                this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                    res.setHeader("Content-Type", "text/html");
                });
            }
        });
    }
}