import { Router, route } from "./router";
export declare class Buchta {
    [x: string]: any;
    router: Router;
    private config;
    port: number;
    private afterRouting;
    private fextHandlers;
    get: route;
    post: route;
    put: route;
    delete: route;
    constructor();
    assignAfterRouting(callback: Function): void;
    assignExtHandler(ext: string, callback: Function): void;
    private getFiles;
    mixInto(plugin: any): void;
    run: (serverPort?: number, func?: Function, server?: this) => void;
}
