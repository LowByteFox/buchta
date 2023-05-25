import { readFileSync } from "fs";
import { BuildFile } from "./mediator";

export type TranspilerHandler = (route: string, path: string, isSsrEnabled: boolean, transpilingSSR: boolean) => Promise<string>

export class Transpiler {
    private transpilers: Map<string, TranspilerHandler> = new Map();

    private async defaultTranspiler(_: string, path: string) {
        return readFileSync(path);
    }

    constructor() {
        this.setTranspiler("js", async (_: string, path: string) => {
            return readFileSync(path, {encoding: "utf8"});
        });
    }

    private getTranspiler(extension: string): TranspilerHandler | undefined {
        return this.transpilers.get(extension);
    }

    setTranspiler(extension: string, handler: TranspilerHandler) {
        this.transpilers.set(extension, handler);
    }

    private getExtension(file: string) {
        return file.split(".").pop();
    }

    compile(file: BuildFile, ssrEn: boolean, currentlySSR: boolean): Promise<string | Buffer> {
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
