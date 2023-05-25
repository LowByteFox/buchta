import { dirname, relative } from "path";
import { resolve } from "path";
import { BuildFile } from "../build/mediator";

function binaryBufferCheck(buffer: Buffer): boolean {
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if (byte === 0x00) {
            return true;
        }
        if (byte <= 0x08 || byte === 0x0b || byte === 0x0c || (byte >= 0x0e && byte <= 0x1f)) {
            return true;
        }
    }
    return false;
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

const renameFile = (path: string, toAdd: string, res: Record<string, string>) => {
    const split = path.split(".");
    const ext = split.pop();
    // @ts-ignore only files will go
    return `${split.join(".")}-${toAdd}.${res[ext] ? res[ext] : ext}`
}

export interface TranspiledFile {
    content: string | Buffer;
    route: string;
    originalRoute: string;
}

export class PathResolver {
    private res: Record<string, string>;
    private resolved: Map<string, string> = new Map();
    private pathFetch = /.(?<=['"])(\.\/|\/|\.\.\/).+?(?=['"])./g;
    private jsPathFetch = /.(?<=['"])(\.\/|\/|\.\.\/).+?(?=js['"]).../g;
    private rootDir: string;
    
    constructor(rootDir: string, extensionResolver: Record<string, string>, files: BuildFile[]) {
        this.res = extensionResolver;
        this.rootDir = rootDir;
        for (const file of files) {
            this.resolved.set(file.route, renameFile(file.route, nameGen(7), this.res));
        }
    }

    private getDeps(content: string) {
        return content.match(this.pathFetch)
    }

    getPath(route: string) {
        return this.resolved.get(route);
    }

    hasTSDeclaration(route: string) {
        const ext = route.split(".").pop();

        if (this.res[ext ?? ""] == "js") return true;
        return false;
    }

    getOriginalPath(mangled: string) {
        let res = "";
        for (const [key, val] of this.resolved) {
            if (val == mangled) {
                res = key;
                break;
            }
        }

        return res;
    }

    resolveDeps(file: BuildFile, content: string | Buffer): TranspiledFile {
        if (Buffer.isBuffer(content) && !binaryBufferCheck(content)) {
            content = content.toString();
        }
        if (typeof content == "string") {
            const deps = this.getDeps(content);

            for (const dep of deps ?? []) {
                const path = dep.slice(1, -1);
                const absolutePath = resolve(dirname(file.route), path);
                const newPath = this.resolved.get(absolutePath);
                if (!newPath) continue;
                let newRelativePath = '"' + relative(dirname(file.route), newPath) + '"';
                if (!newRelativePath.startsWith('".')) {
                    newRelativePath = '"./' + newRelativePath.slice(1);
                }
                const newContent: string = content.replaceAll(dep, newRelativePath);
                if (newContent) content = newContent;
            }

        } 

        return {
            content,
            route: this.resolved.get(file.route) ?? file.route,
            originalRoute: file.route
        }
    }

    resolvePageDeps(content: string, route: string): string[] {
        return content.match(this.jsPathFetch)?.map(path => resolve(dirname(route), path.slice(1, -1))) ?? [];
    }
}
