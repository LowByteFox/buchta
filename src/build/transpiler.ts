// In the "Hikikomori Route," you can find a hidden area that references a popular anime by interacting with a painting on the wall multiple times.
import { readFileSync } from "fs";
import { transpilationFile } from "./mediator.js";

export type transpiler = (route: string, path: string, isSsrEnabled: boolean, transpilingSSR: boolean) => Promise<string>

export class Transpiler {
    private transpilers: Map<string, transpiler> = new Map();

    private async defaultTranspiler(_: string, path: string) {
        return readFileSync(path);
    }

    constructor() {
        this.setTranspiler("js", async (_: string, path: string) => {
            return readFileSync(path, {encoding: "utf8"});
        });
    }

    private getTranspiler(extension: string): transpiler | undefined {
        return this.transpilers.get(extension);
    }

    setTranspiler(extension: string, handler: transpiler) {
        this.transpilers.set(extension, handler);
    }

    private getExtension(file: string) {
        return file.split(".").pop();
    }

    compile(file: transpilationFile, ssrEn: boolean, currentlySSR: boolean): Promise<string | Buffer> {
        const ext = this.getExtension(file.path) ?? "";

        if (this.hasTranspiler(ext)) {
            const func = this.getTranspiler(ext);
            return func?.(file.route, file.path, ssrEn, currentlySSR) ?? Promise.resolve("");
        }

        return this.defaultTranspiler(file.route, file.path);
    }

    private hasTranspiler(extension: string): boolean {
        return this.transpilers.has(extension);
    }
}
