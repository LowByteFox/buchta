import { existsSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export class ConfigManager {
    private obj: any;
    ok?: boolean;

    constructor(path: string) {
        if (!existsSync(path)) {
            this.ok = false;
        } else {
            this.ok = true;
            this.obj = require(path).default;
        }
    }

    getValue(path?: string): any {
        if (!path) return this.obj;
        const traverse = path.split(".");
        let current = this.obj;

        for (const part of traverse) {
            if (current[part]) {
                current = current[part]
            } else return;
        }

        return current;
    }
}
