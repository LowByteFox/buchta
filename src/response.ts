import { readFileSync } from "fs";
const mimeLook = require("mime-types");

export class BuchtaResponse {
    private statusCode: number;
    private headers: Headers;
    private statusText: string;
    private body: string | Uint8Array;
    private filePath: string;
    private redirectTarget: string;

    constructor() {
        this.statusCode = 200;
        this.headers = new Headers();
        this.statusText = "";
        this.body = "";
        this.filePath = null;
    }

    setHeader(name: string, value: string) {
        this.headers.set(name, value);
    }

    send(body: string) {
        this.body = body;
    }

    sendJson(json: any) {
        this.setHeader("Content-Type", "application/json; charset=utf-8");
        this.body = JSON.stringify(json);
    }

    sendFile(filePath: string) {
        if (mimeLook) {
            const mime = mimeLook.lookup(`.${filePath.replace("ts", "js").split(".").pop()}`);
            if (mime)
                this.setHeader("Content-Type", mime);
        }
        this.filePath = filePath;
    }

    redirectTo(path: string) {
        this.redirectTarget = path;
    }

    canRedirect() {
        return this.redirectTarget ? true : false;
    }

    setStatus(statusCode: number) {
        this.statusCode = statusCode;
    }

    setStatusText(statusText: string) {
        this.statusText = statusText;
    }

    buildRedirect() {
        return Response.redirect(this.redirectTarget);
    }

    buildResponse() {
        if (this.filePath)
            return new Response(readFileSync(this.filePath), {
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
