import { Buchta } from "../src/buchta";
import { BuchtaRequest } from "../src/request";
import { BuchtaResponse } from "../src/response";
import { fixRoute, hideImports, showImportsSSR } from "../src/utils/utils";

let compile = null;

try {
    compile = require("svelte/compiler").compile;
} catch (e) {

}

// @ts-ignore It is there
import { spawnSync } from "bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname } from "path";
import { chdir } from "process";

import { BuchtaCLI, BuchtaProjectOption, BuchtaQuestionType } from "../bin/buchta";

export interface buchtaSvelteConf {
    ssr?: boolean;
}

/**
 * Svelte support for Buchta
 * @param {any} buchtaSvelte - options for the svelte compiler
 */
export function svelte(buchtaSvelte: buchtaSvelteConf = { ssr: false }) {
    const opts = buchtaSvelte;

    const patched: Map<string, Array<string>> = new Map();
    const htmls: Map<string, string | undefined> = new Map();

    const preSSR = (route: string, code: string, defaultFileName: string) => {

        let basePath = process.cwd() + "/.buchta/"
        if (!existsSync(basePath + "pre-ssr")) {
            mkdirSync(basePath + "pre-ssr");
        }

        basePath += "pre-ssr";

        code = `const buchtaSSR = typeof document == "undefined" ? true : false;\n${code}`;

        code = showImportsSSR(code, patched, route, basePath);
        // @ts-ignore It is there
        code = code.replaceAll(".svelte", ".js");

        if (!existsSync(basePath + dirname(route))) {
            mkdirSync(basePath + dirname(route), { recursive: true });
        }

        // @ts-ignore It is there
        writeFileSync(basePath + route.replaceAll(".svelte", ".js"), code);

        if (basename(route) == `${defaultFileName}.svelte`) {
            writeFileSync(basePath + route.replace(".svelte", ".js"), code + "console.log(Component.render().html)");
        }
    }

    function svelteHTML(this: Buchta, code: string, ssr: string) {
        const template = this.getTemplate("svelte.html");
        if (template) {
            let html = template.replace("<!-- html -->", () => ssr).replace("<!-- code -->", () => `
<script type="module">
${code}
</script>
                `
            );
            if (this.livereload) {
                html += `
                <script>
                let socket = new WebSocket("ws://localhost:${this.getPort()}");

                socket.onmessage = (e) => { if (e.data == "YEEET!") window.location.reload(); }
                </script>
                `
            }
            return html;
        }

        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${ssr} 
</body>
<script type="module">
${code}
</script>
</html>
`
        if (this.livereload) {
            html += `
    <script>
    let socket = new WebSocket("ws://localhost:${this.getPort()}");

    socket.onmessage = (e) => { if (e.data == "YEEET!") window.location.reload(); }
    </script>
    `
        }

        return html;
    }

    function patchAfterBundle(this: Buchta, route: string, code: string) {
        const defaultFileName = this.getDefaultFileName();

        if (patched.has(route)) {
            const obj = patched.get(route);
            let before = "";
            if (obj)
                for (const e of obj) {
                    before += `${e}\n`;
                }
            code = `${before}\n${code}`;
        }

        if (route.endsWith(`${defaultFileName}.svelte`))
            route = route.substring(0, route.length - 7 - this.getDefaultFileName().length);
        
        if (route.endsWith(`/`) && buchtaSvelte.ssr) {
            let basePath = process.cwd() + "/.buchta/"
            basePath += "pre-ssr";
            chdir(basePath);
            const { stdout, stderr } = spawnSync(["bun", `./${route}/index.js`]);
            const out = stderr?.toString();
            if (out.length > 0) console.log(out);
            const output = stdout.toString();
            const beforeHtml = output.substring(0, output.indexOf("<"));
            // @ts-ignore It is there
            console.write(beforeHtml);
            htmls.set(route, output.slice(output.indexOf("<")));
            chdir("../..");
        }

        if (route.endsWith("/")) {
            code += `
            new Component({
                target: document.body,
                hydrate: true
            });
            `;
        }

        if (route.endsWith(".svelte")) {
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(code);
                res.setHeader("Content-Type", "text/javascript");
            });
        } else {
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(svelteHTML.call(this, code, htmls.get(route) || ""));
                res.setHeader("Content-Type", "text/html; charset=utf-8");
            });
        }
    }

    const assignBuchtaRoute = (code: string, route: string, composables: string) => {
        return `
globalThis.buchtaRoute = () => {
    let params = new Map();

    const path = "${route}";
    let currentPath = "";
    if (typeof window != "undefined")
        currentPath = window.location.href;
    else
        return {
            query: new Map(),
            params: new Map()
        }

    const url = new URL(currentPath);
    const paramDefs = path.match(/:.+?(?=\\/)/g);
    if (!paramDefs) return { query: url.searchParams, params: null };
    const paths = path.split("/");
    const currentPaths = url.pathname.split("/");

    for (const el of paramDefs) {
            const value = currentPaths[paths.indexOf(el)];
        params.set(el.slice(1), value);
    }

    return {
        query: url.searchParams,
        params: params,
    };
};` +
// @ts-ignore It is there
`${composables.replaceAll("\\\"", "\"")}
${code}
`
    }

    return function (this: Buchta | BuchtaCLI) {
        if (this instanceof Buchta) {
            if (!compile) { 
                throw new Error("Svelte not installed!");
            }
            this.assignExtHandler("svelte", function(route: string, file: string) {
                if (patched.has(route)) {
                    patched.set(route, []);
                }
                const content = readFileSync(file, { encoding: "utf-8" });
                const composables = this.generateComposables();
                if (opts.ssr) {
                    const { js } = compile(content, {
                        generate: "ssr"
                    });

                    const code = hideImports(assignBuchtaRoute(js.code, fixRoute(route, this.buildMode, this.getDefaultFileName(), "svelte", "js"), composables || ""), (match: string) => {
                        const arr = patched.get(route) || [];
                        if (!arr.includes(match)) {
                            arr.push(match);
                        }
                        patched.set(route, arr);
                    });

                    preSSR(route, code, this.getDefaultFileName());
                }

                const csr = compile(content, {
                    generate: "dom",
                    hydratable: true
                });

                const code2 = hideImports(assignBuchtaRoute(csr.js.code, fixRoute(route, this.buildMode, this.getDefaultFileName(), "svelte", "js"), composables || ""), (match) => {
                    const arr = patched.get(route) || [];
                    if (!arr.includes(match)) {
                        arr.push(match);
                    }
                    patched.set(route, arr);
                });

                this.bundler.addCustomFile(route, `${route.replace(".svelte", ".js")}`, code2);
                this.bundler.addPatch(route, patchAfterBundle);
            });
        }
        if (this instanceof BuchtaCLI) {
            const opts = new Map<string, BuchtaProjectOption>();

            opts.set("ssr", {pretty: "Do you want SSR?", type: BuchtaQuestionType.YES_OR_NO});
            opts.set("livereload", {pretty: "Enable livereload?", type: BuchtaQuestionType.YES_OR_NO});

            this.setTemplateOptions("svelte", opts);

            this.setPluginTemplate("svelte", {
                filename: "svelte.html",
                content: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<!-- html -->
</body>
<!-- code -->
</html>
`
            });
            
            this.setTemplateCallback("svelte", (opts: Map<string, BuchtaProjectOption>) => {
                const configTemplate = `
import { svelte } from "buchta/plugins/svelte.js";
` + 
// @ts-ignore It is there
`${/(y|yes)/i.exec(opts.get("livereload")?.value) ? "import { livereload } from \"buchta/plugins/livereload.js\";" : " "}

export default {
    port: 3000,

    // @ts-ignore yes there is import.meta.dir
    rootDirectory: import.meta.dir,

    plugins: [svelte({
            ssr: ` + 
            // @ts-ignore It is there
            `${/(y|yes)/i.exec(opts.get("ssr")?.value) ? "true" : "false"},`+
            // @ts-ignore It is there
            `
        }), `+
    // @ts-ignore It is there
    `${/(y|yes)/i.exec(opts.get("livereload")?.value) ? "livereload()" : " "}]
}
`
            writeFileSync("buchta.config.ts", configTemplate);

            console.log("Buchta Svelte project was setup successfully!\n");
            });
        }
    }
}
