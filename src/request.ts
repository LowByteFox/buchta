export interface BuchtaRequest extends Request {
    params: any;
    query: any;
    originalRoute: string;
}