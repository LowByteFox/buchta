import { readFileSync } from "fs";
import { marked } from "marked";
import { Buchta } from "../buchta";
import { BuchtaRequest } from "../request";
import { BuchtaResponse } from "../response";

/**
 * Markdown support for Buchta
 */
export function markdown() {
    return function (this: Buchta) {
        this.assignExtHandler("md", (route: string, file: string) => {
            const content = readFileSync(file, {encoding: "utf-8"});
            const html = marked.parse(content);
            if (route.endsWith(`${this.getDefaultFileName()}.md`))
                route = route.substring(0, route.length - 3 - this.getDefaultFileName().length);

            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(html);
                res.setHeader("Content-Type", "text/html");
            });
        });
    }
}