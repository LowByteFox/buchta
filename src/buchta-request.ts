export class BuchtaRequest {
    readonly query: Map<string, string>;
    readonly params: Map<string, string>;

    readonly originalReq: Request;

    constructor(baseRequest: Request, query: Map<string, string>, params: Map<string, string>) {
        this.originalReq = baseRequest;
        this.query = query;
        this.params = params;
        this.originalReq.blob();
    }
}