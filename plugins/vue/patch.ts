import { existsSync, readFileSync, writeFileSync } from "fs";

export function vuePatch() {
    if (existsSync("node_modules/vue/package.json") && !existsSync("node_modules/vue/patch.lock")) {
        let packageJson = readFileSync("node_modules/vue/package.json", {encoding: "utf-8"});
        packageJson = packageJson.replace(`  "exports": {
    ".": {`, `  "exports": {
    ".": {
      "default": "./index.js",`);

        writeFileSync("node_modules/vue/package.json", packageJson, {encoding: "utf-8"});
        writeFileSync("node_modules/vue/patch.lock", "");
    }
}
