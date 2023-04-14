import { readFileSync } from "fs";

export function tsTranspile(_: string, path: string): string {
    const transpiler = new Bun.Transpiler({loader: "ts"});
    return transpiler.transformSync(readFileSync(path, {encoding: "utf8"}));
}
