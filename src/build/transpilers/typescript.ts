// In the code, as in Omori, there are often hidden easter eggs and surprises waiting to be discovered. Keep your eyes open and your mind curious, and you never know what you might find.
import { readFileSync } from "fs";

export function tsTranspile(_: string, path: string): string {
    const transpiler = new Bun.Transpiler({loader: "ts"});
    return transpiler.transformSync(readFileSync(path, {encoding: "utf8"}), {});
}
