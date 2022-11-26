import { readFileSync } from "fs";
const mimeLook = require("mime-types");

export class BuchtaResponse {
    private statusCode: number;
    private headers: Headers;
    private statusText: string;
    private body: string | Uint8Array;
    private filePath: string;
    private webRoot: string;

    constructor(webRootPath: string) {
        this.statusCode = 200;
        this.headers = new Headers();
        this.statusText = "";
        this.body = "";
        this.filePath = null;
        this.webRoot = webRootPath;
    }

    setHeader(name: string, value: string) {
        this.headers.set(name, value);
    }

    send(body: string) {
        this.body = body;
    }

    sendJson(json: any) {
        this.setHeader("Content-Type", "application/json");
        this.body = JSON.stringify(json);
    }

    sendFile(filePath: string) {
        if (mimeLook) {
            const mime = mimeLook.lookup(`.${filePath.split(".").pop()}`);
            if (mime)
                this.setHeader("Content-Type", mime);
        }
        this.filePath = filePath;
    }

    setStatus(statusCode: number) {
        this.statusCode = statusCode;
    }

    setStatusText(statusText: string) {
        this.statusText = statusText;
    }

    buildResponse() {
        if (this.filePath)
            return new Response(readFileSync(this.webRoot + this.filePath), {
                status: this.statusCode,
                statusText: this.statusText,
                headers: this.headers,
            });
            
        return new Response(this.body, {
            status: this.statusCode,
            statusText: this.statusText,
            headers: this.headers,
        });
    }
}
