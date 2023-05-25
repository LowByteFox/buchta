import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, normalize } from "path";
import { Buchta } from "./buchta";

const extraRoutes: Map<string, any> = new Map();

function makeDir(path: string) {
    if (!existsSync(dirname(path)))
        mkdirSync(dirname(path), {recursive: true});
}

const nameGen = (length: number) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

const renameFile = (path: string, toAdd: string) => {
    const split = path.split(".");
    const ext = split.pop();
    // @ts-ignore only files will go
    return `${split.join(".")}-${toAdd}.${ext}`
}

async function build(routes: any[]) {
    if (!existsSync("dist"))
        mkdirSync("dist");

    const root = normalize(process.cwd() + "/dist/");

    for (const [route, func] of extraRoutes) {
        routes.push({ route, content: "", path: func.path});
    }

    for (const route of routes) {
        if (typeof route.content == "string" || route.content instanceof Buffer) {
            makeDir(normalize(root + route.route));
            copyFileSync(route.path, normalize(root + route.route));
        } else {
            makeDir(normalize(root + route.route));
            writeFileSync(normalize(root + route.route + "/index.html"), await route.content(route.route, route.route));
        }
    }
}

export const exportHook = (build: Buchta) => {
    build.on("fileLoad", (data) => {
        data.route = "/" + renameFile(basename(data.path), nameGen(7));

        extraRoutes.set(data.route, data);
    })
}

export default build;
