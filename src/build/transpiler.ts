import { readFileSync } from "fs";
import { transpilationFile } from "./mediator.js";

export class Transpiler {
    private transpilers: Map<string, (route: string, path: string) => string> = new Map();

    private defaultTranspiler(_: string, path: string) {
        return readFileSync(path);
    }

    constructor() {
        this.setTranspiler("js", (_: string, path: string) => {
            return readFileSync(path, {encoding: "utf8"});
        });
    }

    private getTranspiler(extension: string): ((route: string, path: string) => string) | undefined {
        return this.transpilers.get(extension);
    }

    setTranspiler(extension: string, handler: (route: string, path: string) => string) {
        this.transpilers.set(extension, handler);
    }

    private getExtension(file: string) {
        return file.split(".").pop();
    }

    compile(file: transpilationFile): string | Buffer {
        const ext = this.getExtension(file.path) ?? "";

        if (this.hasTranspiler(ext)) {
            const func = this.getTranspiler(ext);
            return func?.(file.route, file.path) ?? "";
        }

        return this.defaultTranspiler(file.route, file.path);
    }

    private hasTranspiler(extension: string): boolean {
        return this.transpilers.has(extension);
    }
}
