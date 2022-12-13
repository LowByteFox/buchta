import { BuchtaRequest } from './request';
import { BuchtaResponse } from './response';
export type route = (path: string, callback: (req: BuchtaRequest, res: BuchtaResponse) => void, ...data: any[]) => void;
export declare class Router {
    routes: Map<string, (req: BuchtaRequest, res: BuchtaResponse) => void>;
    preParams: Map<string, Map<string, number>>;
    params: Map<string, string>;
    get: route;
    post: route;
    put: route;
    delete: route;
    constructor();
    private healRoute;
    handle(path: string, method: string): (req: BuchtaRequest, res: BuchtaResponse) => void;
}
