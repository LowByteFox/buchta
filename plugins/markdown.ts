import { readFileSync } from "fs";
import { marked } from "marked";
import { BuchtaCLI } from "../bin/buchta";
import { Buchta } from "../src/buchta";
import { BuchtaRequest } from "../src/request";
import { BuchtaResponse } from "../src/response";

/**
 * Markdown support for Buchta
 */
export function markdown() {
    return function (this: Buchta | BuchtaCLI) {
        if (this instanceof Buchta) {
            this.assignExtHandler("md", function(route: string, file: string) {
                const content = readFileSync(file, {encoding: "utf-8"});
                let html = marked.parse(content);

                if (this.livereload) {
                    html += `
                    <script>
                    let socket = new WebSocket("ws://localhost:${this.getPort()}");

                    socket.onmessage = (e) => { if (e.data == "YEEET!") window.location.reload(); }
                    </script>
                    `
                }

                if (route.endsWith(`${this.getDefaultFileName()}.md`))
                    route = route.substring(0, route.length - 3 - this.getDefaultFileName().length);

                this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                    res.send(html);
                    res.setHeader("Content-Type", "text/html; charset=utf-8");
                });
            });
        }
    }
}