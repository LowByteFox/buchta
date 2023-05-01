import { basename } from "path";
import { Buchta, BuchtaPlugin } from "../../src/buchta";
import { compileVue } from "./compiler";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { PluginBuilder } from "bun";

export default function vue(): BuchtaPlugin {

    async function vueTranspile(_: string, path: string, ssrEnabled: boolean, currentlySSR: boolean) {
        return compileVue(path, ssrEnabled, currentlySSR) ?? "";
    }

    function vuePage(route: string) {
        return `<!DOCTYPE html>
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

    async function vueSSRPage(_orig: string, _route: string, csrHTML: string, modFile: string) {
        const mod = require(modFile).default;

        const app = createSSRApp(mod);

        return csrHTML.replace("<!-- HTML -->", await renderToString(app));
    }

    return {
        name: "vue",
        dependsOn: [],
        conflictsWith: [],
        driver(this: Buchta) {
            this.builder.addTranspiler("vue", "js", vueTranspile);
            this.builder.addPageHandler("vue", vuePage);
            if (this.ssr) {
                this.builder.addSsrPageHandler("vue", vueSSRPage);
            }

            const b = this;

            this.pluginManager.setBundlerPlugin({
                name: "vue",
                async setup(build: PluginBuilder) {
                    build.onLoad({ filter: /\.vue$/ }, ({ path }) => {
                        return {
                            contents: compileVue(path, b.ssr, false) ?? "",
                            loader: "js"
                        }
                    })
                }
            });

            this.pluginManager.setServerPlugin({
                name: "vue",
                async setup(build: PluginBuilder) {
                    build.onLoad({ filter: /\.vue$/ }, ({ path }) => {
                        return {
                            contents: compileVue(path, b.ssr, b.ssr) ?? "",
                            loader: "js"
                        }
                    })
                }
            })
        },
    }
}
