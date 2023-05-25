import { basename } from "path";
import { Buchta, BuchtaPlugin } from "../../src/buchta";
import { compileVue } from "./compiler";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { PluginBuilder } from "bun";

export const App = {
    components: new Map<string, any>(),
    plugins: new Map<any, any[]>(),

    clientImports: [] as string[],
    clientPlugins: new Map<string, string>(),
    clientComponents: new Map<string, string>(),

    component(name: string, component: any) {
        this.components.set(name, component);
        return this;
    },
    clientComponent(name: string, component: string, importCode: string) {
        this.clientImports.push(importCode);
        this.clientComponents.set(name, component);
        return this;
    },
    use(plugin: any, ...config: any[]) {
        this.plugins.set(plugin, config);
        return this;
    },
    clientUse(plugin: string, config: string, importCode: string) {
        this.clientImports.push(importCode);
        this.clientPlugins.set(plugin, config);
        return this;
    }
}

export default function vue(): BuchtaPlugin {

    async function vueTranspile(_: string, path: string, ssrEnabled: boolean, currentlySSR: boolean) {
        return compileVue(path, ssrEnabled, currentlySSR, App.clientImports, App.clientPlugins, App.clientComponents) ?? "";
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

        for (const [name, comp] of App.components) {
            app.component(name, comp);
        }

        for (const [plug, settings] of App.plugins) {
            app.use(plug, settings);
        }

        return csrHTML.replace("<!-- HTML -->", await renderToString(app));
    }

    return {
        name: "vue",
        dependsOn: [],
        conflictsWith: [],
        driver(this: Buchta) {
            this.addTranspiler("vue", "js", vueTranspile);
            this.addPageHandler("vue", vuePage);
            if (this.config?.ssr) {
                this.addSSRPageHandler("vue", vueSSRPage);
            }

            this.setBundlerPlugin({
                name: "vue",
                setup: async (build: PluginBuilder) => {
                    build.onLoad({ filter: /\.vue$/ }, ({ path }) => {
                        return {
                            contents: compileVue(path, this.config?.ssr ?? true, false, App.clientImports, App.clientPlugins, App.clientComponents) ?? "",
                            loader: "js"
                        }
                    })
                }
            });

            this.setServerPlugin({
                name: "vue",
                setup: async (build: PluginBuilder) => {
                    build.onLoad({ filter: /\.vue$/ }, ({ path }) => {
                        return {
                            contents: compileVue(path, this.config?.ssr ?? true, this.config?.ssr ?? true, App.clientImports, App.clientPlugins, App.clientComponents) ?? "",
                            loader: "js"
                        }
                    })
                }
            })
        },
    }
}
