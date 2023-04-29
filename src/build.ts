import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, normalize } from "path";

function makeDir(path: string) {
    if (!existsSync(dirname(path)))
        mkdirSync(dirname(path), {recursive: true});
}

export default function(routes: any[]) {
    if (!existsSync("dist"))
        mkdirSync("dist");

    const root = normalize(process.cwd() + "/dist/");

    for (const route of routes) {
        if (typeof route.content == "string") {
            makeDir(normalize(root + route.route));
            Bun.write(normalize(root + route.route), Bun.file(route.path));
        } else {
            makeDir(normalize(root + route.route));
            writeFileSync(normalize(root + route.route + "/index.html"), route.content(route.route, route.route));
        }
    }
}
