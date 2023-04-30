import { readFileSync } from "fs";
import { Buchta, BuchtaPlugin } from "../src/buchta";
import { basename } from "path";
import { renderToString } from "react-dom/server";

interface ReactConfig {
    tsx?: boolean;
}

export function react(conf: ReactConfig): BuchtaPlugin {

    async function reactTranspile(route: string, path: string, isSSRenabled: boolean, currentlySSR: boolean) {
        const content = readFileSync(path, {encoding: "utf-8"});

        const transpiler = new Bun.Transpiler({
            loader: "tsx",
            autoImportJSX: true
        })

        let code = `${transpiler.transformSync(content, {})}`

        if (route.match(/(index\.jsx|index\.tsx)$/)) {
            if (currentlySSR) {
                code += "\nexport default index";
                return code;
            }
            if (isSSRenabled) {
                code = `import { hydrateRoot } from 'react-dom/client';\n${code}`
                code += "\nhydrateRoot(document.getElementById('__buchta'), index());\nexport default index";
            } else {
                code = `import { createRoot } from 'react-dom/client';\n${code}`
                code += "\nconst root = createRoot(document.getElementById('__buchta'));\nroot.render(index());"
            }
        }

        return code;
    }

    // SPA preparation
    function reactPage(route: string) {

        return  `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body>
<div id="__buchta"><!-- HTML --></div>
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
