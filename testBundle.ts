import { BuchtaPlugin } from "./src/buchta";

export function testBundle(): BuchtaPlugin {
    return {
        name: "testBundle",
        driver() {
            this.customBundle.addMacroFile(import.meta.dir + "/bunver.ts", ["BunFunc"], ["globalThis.Bun = BunFunc();"]);
        }
    }
}
