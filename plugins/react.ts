import { readFileSync, writeFileSync } from "fs";
import { Buchta, BuchtaPlugin } from "../src/buchta";
import { basename } from "path";
import { renderToString } from "react-dom/server";

interface ReactConfig {
    tsx?: boolean;
}

export function react(conf: ReactConfig): BuchtaPlugin {

    // jsx/tsx to js
    function reactTranspile(_: string, path: string) {
        const content = readFileSync(path, {encoding: "utf-8"});

        const transpiler = new Bun.Transpiler({
            loader: "tsx",
            tsconfig: JSON.stringify({
                "compilerOptions": {
                    "jsx": "react",
                    "jsxFactory": "createElement",
                    "jsxFragmentFactory": "Fragment",
                }
            })
        })

        const code = `import { createElement, Fragment } from "react"\n${transpiler.transformSync(content, {})}`

        return code;
    }

    // SPA preparation
    function reactPage(route: string, path: string) {
        const content = readFileSync(path, {encoding: "utf-8"});
        const split = content.split("\n");
        split.pop();
        split.pop();
        split.push("hydrateRoot(document.body, index());");
        split.unshift("import { hydrateRoot } from 'react-dom/client';");
        writeFileSync(path, split.join("\n"));

        return  `<!DOCTYPE html>
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

    function reactSSRPage(_originalRoute: string, _route: string, csrHTML: string, modFile: string) {
        const mod = require(modFile).default;

        renderToString(mod());

        return csrHTML;
    }
    
    return {
        name: "react",
        version: "0.1",
        dependsOn: [],
        conflictsWith: [],
        driver(this: Buchta) {
            this.builder.addTranspiler("jsx", "js", reactTranspile);
            this.builder.addPageHandler("jsx", reactPage);
            if (conf.tsx) {
                this.builder.addTranspiler("tsx", "js", reactTranspile);
                this.builder.addPageHandler("tsx", reactPage);
            }

            if (this.ssr) {
                this.builder.addSsrPageHandler("jsx", reactSSRPage);
                if (conf.tsx) this.builder.addSsrPageHandler("tsx", reactSSRPage);
            }
        }
    }
}
