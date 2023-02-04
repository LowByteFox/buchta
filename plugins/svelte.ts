import { Buchta } from "../src/buchta";
import { BuchtaRequest } from "../src/request";
import { BuchtaResponse } from "../src/response";
import { hideImports } from "../src/utils/utils";

import { compile } from "svelte/compiler";

// @ts-ignore It is there
import { spawnSync } from "bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname } from "path";
import { chdir } from "process";

import * as UglifyJS from "uglify-js";

/**
 * Svelte support for Buchta
 * @param {any} buchtaSvelte - options for the svelte compiler
 */
export function svelte(buchtaSvelte: any = { ssr: false }) {

    const options = {
        mangle: {
            toplevel: true,
        },
        nameCache: {}
    };

    const opts = buchtaSvelte;

    const patched: Map<string, Array<string>> = new Map();
    const htmls: Map<string, string | undefined> = new Map();

    const preSSR = (route: string, code: string, defaultFileName: string) => {
        if (patched.has(route)) {
            const obj = patched.get(route);
            let before = "";
            if (obj)
                for (const e of obj) {
                    before += `${e}\n`;
                }
            code = `${before}\n${code}`;
        }
        // @ts-ignore It is there
        code = code.replaceAll(".svelte", ".js");
        let basePath = process.cwd() + "/.buchta/"
        if (!existsSync(basePath + "pre-ssr")) {
            mkdirSync(basePath + "pre-ssr");
        }

        basePath += "pre-ssr";

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

        if (route.endsWith(`${defaultFileName}.svelte`)) {
            route = route.substring(0, route.length - 7 - this.getDefaultFileName().length);

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

        code += `
new Component({
    target: document.body,
    hydrate: true
});
`;
        if (opts?.minify) {
            const out = UglifyJS.minify(code, options);
            code = out.code;
        }

        if (route.endsWith(".svelte")) {
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(code);
                res.setHeader("Content-Type", "text/javascript");
            });
        } else {
            this.get(route, (req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(svelteHTML.call(this, code, htmls.get(route) || ""));
                res.setHeader("Content-Type", "text/html");
            });
        }
    }

    const assignBuchtaRoute = (code: string, route: string) => {
        return `
const buchtaRoute = () => {
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
}

${code}
`
    }

    return function (this: Buchta) {
        this.assignExtHandler("svelte", (route: string, file: string) => {
            const content = readFileSync(file, { encoding: "utf-8" });
            if (opts.ssr) {
                const { js } = compile(content, {
                    generate: "ssr"
                });

                const code = hideImports(assignBuchtaRoute(js.code, route), (match) => {
                    const arr = patched.get(route) || new Array<string>();
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

            const code2 = hideImports(assignBuchtaRoute(csr.js.code, route), (match) => {
                const arr = patched.get(route) || new Array<string>();
                if (!arr.includes(match)) {
                    arr.push(match);
                }
                patched.set(route, arr);
            });

            this.bundler.addCustomFile(route, `${route.replace(".svelte", ".js")}`, code2);
            this.bundler.addPatch(route, patchAfterBundle);
        });
    }
}