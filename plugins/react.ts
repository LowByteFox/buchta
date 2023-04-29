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
            autoImportJSX: true
        })

        let code = `${transpiler.transformSync(content, {})}`

        // @ts-ignore SRR
        if (__BUCHTA_SSR) {
            code = `import { renderToString } from 'react-dom/server';\n${code}`;
            if (path.match(/(index\.jsx|index\.tsx)$/)) {
                code += "\nexport default index";
            }
        }

        return code;
    }

    // SPA preparation
    function reactPage(route: string, path: string) {
        const content = readFileSync(path, {encoding: "utf-8"});
        const split = content.split("\n");
        split.pop();
        split.push("const domNode = document.getElementById('root');\nhydrateRoot(domNode, index());");
        split.unshift("import { hydrateRoot } from 'react-dom/client';");
        writeFileSync(path, split.join("\n"));

        return  `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body>
<div id="root"><!-- HTML --></div>
</body>
<script type="module" src="./${basename(route)}"></script>
</html>`
    }

    function reactSSRPage(_originalRoute: string, _route: string, csrHTML: string, modFile: string) {
        const mod = require(modFile).default;

        return csrHTML.replace("<!-- HTML -->", renderToString(mod()));
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
