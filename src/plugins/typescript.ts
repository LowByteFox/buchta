import { readFileSync } from "fs";
import { BuchtaRequest } from "../request";
import { BuchtaResponse } from "../response";

export function typescript() {
    return function () {
        this.fextHandlers.set("ts", async (route: string, file: string, server = this) => {
            const transpiler = new Bun.Transpiler({loader: "ts"});
            let transpiled = await transpiler.transform(readFileSync(file, {encoding: "utf-8"}));
            server.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(transpiled);
                res.setHeader("Content-Type", "application/javascript");
            });
        });
    }
}