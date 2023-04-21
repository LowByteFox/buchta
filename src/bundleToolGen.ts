import { writeFileSync } from "fs";
import { normalize, relative } from "path";

export class CustomBundle {
    private rootDir: string;
    imports: string[] = [];
    content: string = "";

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    relativeImport(path: string) {
        return relative(normalize(this.rootDir + "/.buchta/"), path);
    }

    toString() {
        let code = "";
        for (const i of  this.imports) {
            code += i;
        }

        code += this.content;

        return code;
    }

    dump() {
        writeFileSync(normalize(this.rootDir + "/.buchta/customBundle.ts"), this.toString());
    }
}
