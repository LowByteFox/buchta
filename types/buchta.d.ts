import { Router, route } from "./router";
export declare class Buchta {
    [x: string]: any;
    router: Router;
    private config;
    port: number;
    private afterRouting;
    fextHandlers: Map<string, Function>;
    get: route;
    post: route;
    put: route;
    delete: route;
    constructor();
    assingAfterRouting(callback: Function): void;
    private getFiles;
    mixInto(plugin: any): void;
    run: (serverPort?: number, func?: Function, server?: this) => void;
}
