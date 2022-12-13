import { readFileSync } from "fs";
import { marked } from "marked";
import { BuchtaRequest } from "../request";
import { BuchtaResponse } from "../response";

export function markdown() {
    return function () {
        this.assignExtHandler("md", (route: string, file: string) => {
            const content = readFileSync(file, {encoding: "utf-8"});
            const html = marked.parse(content);
            if (route.endsWith(`${this.config.routes.fileName}.md`))
                route = route.substring(0, route.length - 3 - this.config.routes.fileName.length);

            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(html);
                res.setHeader("Content-Type", "text/html");
            });
        });
    }
}