import { Buchta } from "../src/buchta";
import { BuchtaRequest } from "../src/request";
import { BuchtaResponse } from "../src/response";
import { awaitImportRegex, cjsModuleRegex, hideImports, showImportsSSR } from "../src/utils/utils";

// @ts-ignore It is there
import { spawnSync } from "bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname } from "path";
import { chdir } from "process";

import * as UglifyJS from "uglify-js";
import { BuchtaCLI } from "../bin/buchta";

export interface buchtaPreactConf {
    ssr?: boolean;
    tsx?: boolean;
    minify?: boolean;
}

// TODO: Make plugin new CLI compatible
export function preact(buchtaPreact: buchtaPreactConf = { ssr: false }) {

    const opts = buchtaPreact;

    const patched: Map<string, Array<string>> = new Map();
    const htmls: Map<string, string | undefined> = new Map();

    function pageGen(this: Buchta, code: string, html: string) {
        const template = this.getTemplate("preact.html");
        if (template) {
            let output = template.replace("<!-- html -->", () => html).replace("<!-- code -->", () => `
<script type="module">
${code}
</script>
`);
            if (this.livereload) {
                output += `
                <script>
                let socket = new WebSocket("ws://localhost:${this.getPort()}");

                socket.onmessage = (e) => { if (e.data == "YEEET!") window.location.reload(); }
                </script>
                `
            }
            return output;
        }

        let output = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${html}
</body>
<script type="module">
${code}
</script>
</html>
`
        if (this.livereload) {
            output += `
                <script>
                let socket = new WebSocket("ws://localhost:${this.getPort()}");

                socket.onmessage = (e) => { if (e.data == "YEEET!") window.location.reload(); }
                </script>
                `
        }
        return output;
    }

    const preSSR = (route: string, code: string, defaultFileName: string, ext: string) => {
        let basePath = process.cwd() + "/.buchta/"
        if (!existsSync(basePath + "pre-ssr")) {
            mkdirSync(basePath + "pre-ssr");
        }
        basePath += "pre-ssr";

        code = `const buchtaSSR = typeof document == "undefined" ? true : false;\n${code}`;
        code = showImportsSSR(code, patched, route, basePath);
        // @ts-ignore It is there
        code = code.replaceAll(".tsx", ".js").replaceAll(".jsx", ".js");


        if (!existsSync(basePath + dirname(route))) {
            mkdirSync(basePath + dirname(route), { recursive: true });
        }

        // @ts-ignore It is there
        writeFileSync(basePath + route.replaceAll(".tsx", ".js").replaceAll(".jsx", ".js"), code);

        if (basename(route) == `${defaultFileName}${ext}`) {
            writeFileSync(basePath + route.replace(ext, ".js"), code + "console.log(render(index()))");
        }
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
        if ((route.endsWith(`${this.getDefaultFileName()}.jsx`) || route.endsWith(`${this.getDefaultFileName()}.tsx`)))
            route = route.substring(0, route.length - 4 - this.getDefaultFileName().length);

        if (route.endsWith("/") && opts.ssr) {
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

        if (opts?.minify) {
            const out = UglifyJS.minify(code);
            code = out.code;
        }

        if (route.endsWith(".jsx") || route.endsWith(".tsx")) {
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(code);
                res.setHeader("Content-Type", "text/javascript");
            });
        } else {
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(pageGen.call(this, code, htmls.get(route) || "",));
                res.setHeader("Content-Type", "text/html");
            });
        }
    }

    function handle(this: Buchta, route: string, file: string, ext: string) {
        if (patched.has(route)) {
            patched.set(route, []);
        }
        const content = readFileSync(file, { encoding: "utf-8" });

        // @ts-ignore It is there
        const transpiler = new Bun.Transpiler({
            loader: "tsx",
            tsconfig: JSON.stringify({
                "compilerOptions": {
                    "jsx": "react",
                    "jsxFactory": "h",
                    "jsxFragmentFactory": "Fragment",
                }
            })
        });

        if (opts.ssr == undefined) throw new Error("ssr field in config is missing!");
        let code;
        if (opts.ssr) {
            code = `import { h, hydrate, Fragment } from "preact";import render from "preact-render-to-string";\n${transpiler.transformSync(content, {})}\n`;
        } else {
            code = `import { h, hydrate, Fragment } from "preact";\n${transpiler.transformSync(content, {})}\n`;
        }

        // @ts-ignore It is there
        code = assignBuchtaRoute(hideImports(code, (match) => {
            const arr = patched.get(route) || new Array<string>();
            if (!arr.includes(match)) {
                arr.push(match);
            }
            patched.set(route, arr);
            // @ts-ignore It is there
        }).replaceAll("jsxEl", "_jsxEl").replaceAll("JSXFrag", "_JSXFrag"), route);

        if (opts.ssr) {
            preSSR(route, code, this.getDefaultFileName(), ext);
        }

        if (route.endsWith(`${this.getDefaultFileName()}${ext}`)) {
            let route2 = route.substring(0, route.length - 4 - this.getDefaultFileName().length);

            if (!route2.endsWith(ext)) {
                code += "\nhydrate(index(), document.body)\n";
            }
        }

        this.bundler.addCustomFile(route, `${route.replace(ext, ".js")}`, code);
        this.bundler.addPatch(route, patchAfterBundle);
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

    return function (this: Buchta | BuchtaCLI) {

        if (this instanceof Buchta) {
            if (opts.ssr) {
                try {
                    require("preact-render-to-string");
                } catch {
                    throw new Error("To use SSR with Preact, please install 'preact-render-to-string'");
                }
            }

            this.assignExtHandler("jsx", (route: string, file: string) => {
                handle.call(this, route, file, ".jsx");
            });

            if (opts.tsx) {
                this.assignExtHandler("tsx", (route: string, file: string) => {
                    handle.call(this, route, file, ".tsx");
                });
            }
        }
    }
}