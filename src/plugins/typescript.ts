import { readFileSync } from "fs";
import { Buchta } from "../buchta";
import { BuchtaRequest } from "../request";
import { BuchtaResponse } from "../response";

/**
 * Typescript support for Buchta
 */
export function typescript() {
    return function (this: Buchta) {
        this.assignExtHandler("ts", async (route: string, file: string) => {
            const transpiler = new Bun.Transpiler({loader: "ts"});
            let transpiled = await transpiler.transform(readFileSync(file, {encoding: "utf-8"}));
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(transpiled);
                res.setHeader("Content-Type", "application/javascript");
            });
        });
    }
}