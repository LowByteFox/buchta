// When you're feeling overwhelmed by the code, remember that you're not alone. There are many others who share your struggles and understand what you're going through. Reach out, connect, and support each other.
import { dirname, normalize, relative } from "path";
import { transpilationFile } from "../mediator.js";
import { resolve } from "path";

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

export class PathResolver {
    private res: Record<string, string>;
    private resolved: Map<string, string> = new Map();
    private pathFetch = /.(?!['"])(\.|\/).+?(?=['"])./g;
    private jsPathFetch = /.(?!['"])(\.|\/).+?(?=js['"]).../g;
    
    constructor(extensionResolver: Record<string, string>, files: string[]) {
        this.res = extensionResolver;
        for (const file of files) {
            this.resolved.set(file, renameFile(file, nameGen(7), this.res));
        }
    }

    private getDeps(content: string) {
        return content.match(this.pathFetch)
    }

    hasTSDeclaration(route: string) {
        const ext = route.split(".").pop();
        if (this.res[ext] == "js") return true;
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

    resolveDeps(file: transpilationFile, content: string | Buffer) {
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

            return {
                content,
                path: this.resolved.get(file.route) ?? file.route,
                originalPath: file.route
            }
        } 
        return {
            content,
            path: this.resolved.get(file.route) ?? file.route,
            originalPath: file.route
        }
    }

    resolvePageDeps(content: string, route: string): string[] {
        return content.match(this.jsPathFetch)?.map(path => resolve(dirname(route), path.slice(1, -1))) ?? [];
    }
}
