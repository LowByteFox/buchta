import { readFileSync } from "fs";

export class BuchtaResponse {
    statusCode: number;
    headers: Headers;
    statusText: string;
    body: string | Uint8Array;
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

    send = (data: string, statusCode=200) => {
        try {
            this.body = JSON.stringify(JSON.parse(data));
            this.headers.append("content-type", "application/json");
        } catch {
            this.body = data;
            this.headers.append("content-type", "text/html; charset=UTF-8");
        }
        this.statusCode = statusCode;
    }
    
    sendFile = (path: string) => {
        this.filePath = path;
    }

    constructResponse = (): Response => {
        if (this.filePath) {
            return new Response(readFileSync(`${this.webRoot}/${this.filePath}`), {
                status: this.statusCode,
                headers: this.headers,
                statusText: this.statusText
            });
        }
        return new Response(this.body, {
            status: this.statusCode,
            headers: this.headers,
            statusText: this.statusText
        });
    }
}