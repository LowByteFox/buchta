import { dirname, relative } from "path";
import { Buchta, BuchtaPlugin } from "../src/buchta";
import { writeFileSync } from "fs";

export default function(): BuchtaPlugin {
    let filesToBundle: string[] = [];
    let bundleActions: string[] = [];

    return {
        name: "customBundle",
        driver(this: Buchta) {
            let rootDir = this.config?.rootDir;

            this.customBundle = {
                addFile: (file: string) => {
                    filesToBundle.push('"' + file + '"');
                },
                addMacroFile: (file: string, exports: string[], actions: string[]) => {
                    filesToBundle.push(`{${exports.join(",")}} from '${file}' with { type: "macro" }`);
                    bundleActions.push(...actions);
                }
            }

            let bundleContent = "";

            let bundle = rootDir + "/.buchta/customBundle.ts";
            let outputDir = rootDir + "/.buchta/output";

            this.builderOn("afterTranspilation", (transpiled, ssrTranspiled) => {
                // for for each file in filesToBundle and add them as imports to bundleContent
                for (let i = 0; i < filesToBundle.length; i++) {
                    let file = filesToBundle[i];
                    let relativePath = relative(dirname(bundle), file);
                    bundleContent += `import "${relativePath}";\n`;
                }

                for (let [_key, transpiledFile] of transpiled) {
                    let path = outputDir + transpiledFile.route;
                    if (path.endsWith(".js") || path.endsWith(".ts")) {
                        let relativePath = relative(dirname(path), bundle);
                        transpiledFile.content = `import "${relativePath}";\n${transpiledFile.content}`;
                    }
                }

                // do the same for ssrTranspiled
                for (let [_key, transpiledFile] of ssrTranspiled) {
                    let path = outputDir + transpiledFile.route;
                    if (path.endsWith(".js") || path.endsWith(".ts")) {
                        let relativePath = relative(dirname(path), bundle);
                        transpiledFile.content = `import "${relativePath}";\n${transpiledFile.content}`;
                    }
                }

                // turn imports into lines
                let out = filesToBundle.map(file => {
                    return `import ${file}`;
                }).join("\n");

                out += "\n\n" + bundleActions.join("\n");

                writeFileSync(bundle, out);
            });
                // add actions
        }
    }
}
