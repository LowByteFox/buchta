/// <reference types="bun-types" />
export declare class BuchtaResponse {
    private statusCode;
    private headers;
    private statusText;
    private body;
    private filePath;
    constructor();
    setHeader(name: string, value: string): void;
    send(body: string): void;
    sendJson(json: any): void;
    sendFile(filePath: string): void;
    setStatus(statusCode: number): void;
    setStatusText(statusText: string): void;
    buildResponse(): Response;
}
