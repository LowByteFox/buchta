import { readFileSync } from "fs";

export class BuchtaResponse {
    private statusCode: number;
    private headers: Headers;
    private statusText: string;
    private body: string | Uint8Array;
    private file: Blob | null;
    private path: string = "";
    private redirectTarget: string = "";

    constructor() {
        this.statusCode = 200;
        this.headers = new Headers();
        this.statusText = "";
        this.body = "";
        this.file = null;
    }

    setHeader(name: string, value: string) {
        this.headers.set(name, value);
        return this;
    }

    send(body: string) {
        this.body = body;
        return this;
    }

    sendJson(json: any) {
        this.setHeader("Content-Type", "application/json; charset=utf-8");
        this.body = JSON.stringify(json);
        return this;
    }

    sendFile(filePath: string) {
        this.path = filePath;
        this.file = Bun.file(filePath);
        this.headers.set("Content-Type", this.file.type);
        return this;
    }

    redirectTo(path: string) {
        this.redirectTarget = path;
        return this;
    }

    canRedirect() {
        return this.redirectTarget ? true : false;
    }

    setStatus(statusCode: number) {
        this.statusCode = statusCode;
        return this;
    }

    setStatusText(statusText: string) {
        this.statusText = statusText;
        return this;
    }

    buildRedirect() {
        return Response.redirect(this.redirectTarget);
    }

    buildResponseSync() {
        if (this.file)
            return new Response(readFileSync(this.path), {
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
