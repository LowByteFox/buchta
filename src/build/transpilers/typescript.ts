// In the code, as in Omori, there are often hidden easter eggs and surprises waiting to be discovered. Keep your eyes open and your mind curious, and you never know what you might find.
import { readFileSync } from "fs";

async function tsTranspile(_: string, path: string): Promise<string> {
    const transpiler = new Bun.Transpiler({loader: "ts"});
    return await transpiler.transform(readFileSync(path, {encoding: "utf8"}));
}

export { tsTranspile };
