import { PluginBuilder } from "bun";
import { readFileSync } from "fs";
import { Buchta, BuchtaPlugin } from "~/src/buchta";

export function css(): BuchtaPlugin {
    return {
        name: "css",
        version: "0.1",
        dependsOn: [],
        conflictsWith: [],
        driver(this: Buchta) {
            this.pluginManager.setBundlerPlugin({
                name: "css",
                async setup(build: PluginBuilder) {
                    build.onLoad({ filter: /\.css$/ }, ({ path }) => {
                        const content = readFileSync(path, {encoding: "utf-8"});
                        const code = `
let head = document.head;
let style = document.createElement("style");
head.appendChild(style);
style.type = "text/css";
style.appendChild(document.createTextNode(\`${content}\`));
                        `

                        return {
                            contents: code,
                            loader: "js"
                        }
                    })
                }
            });

            this.pluginManager.setServerPlugin({
                name: "css",
                async setup(build: PluginBuilder) {
                    build.onLoad({ filter: /\.css$/ }, () => {
                        return {
                            loader: "js",
                            contents: "export default { h: \"ahoj\" }"
                        }
                    })
                }
            });
        }
    }
}
