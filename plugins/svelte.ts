import { readFileSync } from "fs";
import { basename } from "path";
import { compile, preprocess} from "svelte/compiler";
import { Buchta, BuchtaPlugin } from "../src/buchta.js";
import { PluginBuilder } from "bun";

export function svelte(): BuchtaPlugin {

    const tsTranspiler = new Bun.Transpiler({loader: "ts"});

    async function svelteTranspile(route: string, path: string, isSSREnabled: boolean, currentlySSR: boolean) {
        let content = readFileSync(path, {encoding: "utf8"});

        const { code: preprocessed } = await preprocess(content, {
            script: ({ content, attributes }) => {
                if (attributes.lang != "ts") return { code: content };
                return {
                    code: tsTranspiler.transformSync(content, {})
                }
            }
        })

        content = preprocessed;

        const { js } = compile(content, {
            // @ts-ignore types
            generate: currentlySSR ? "ssr" : "dom",
            hydratable: true,
        });

        let code = js.code;

        code = code.replace(/\tmap:.+/, "");

        if (route.endsWith("index.svelte")) {
            if (currentlySSR) return code;
            if (isSSREnabled)
                code += "\nnew Component({ target: document.body, hydrate: true });"
            else
                code += "\nnew Component({ target: document.body });"
        }

        return code;
    }

    function sveltePage(route: string) {

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

    async function svelteSSRPage(_originalRoute: string, _route: string, csrHTML: string, modFile: string) {
        const mod = require(modFile).default;

        return csrHTML.replace("<!-- HTML -->", mod.render().html);
    }

    return {
        name: "svelte",
        dependsOn: [],
        conflictsWith: [],
        driver(this: Buchta) {
            this.addTranspiler("svelte", "js", svelteTranspile);
            this.addPageHandler("svelte", sveltePage);
            if (this.config?.ssr) {
                this.addSSRPageHandler("svelte", svelteSSRPage);
            }

            this.setBundlerPlugin({
                name: "svelte",
                async setup(build: PluginBuilder) {
                    build.onLoad({ filter: /\.svelte$/ }, ({ path }) => {
                        const content = readFileSync(path, {encoding: "utf-8"})

                        const out = compile(content, {
                            generate: "dom",
                            hydratable: true
                        })

                        return {
                            contents: out.js.code,
                            loader: "js"
                        }
                    })
                },
            })

            this.setServerPlugin({
                name: "Svelte",
                setup: async (build: PluginBuilder) => {
                    build.onLoad({ filter: /\.svelte$/ }, ({ path }) => {
                        const content = readFileSync(path, {encoding: "utf-8"})
                        const out = compile(content, {
                            generate: this.config?.ssr ? "ssr" : "dom",
                            hydratable: true
                        });

                        return {
                            contents: out.js.code,
                            loader: "js"
                        }
                    })
                }
            })
        }
    }
}
