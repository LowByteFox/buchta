import { BuchtaRequest } from "./buchta-request";
import { BuchtaResponse } from "./buchta-response";

const patchRoute = (route: string) => {
    let copy = route.replaceAll("//", "/");
    if (copy[copy.length-1] != "/") {
        copy += "/";
    }
    return copy;
}

export class BuchtaRouter {
    routeParams: Map<string, string>;
    route: string;
    routeQuery: Map<string, string>;
    fileExtension: string;
    private tree = new TrieNode();

    GET: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    POST: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    PATCH: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    DELETE: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    PUT: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};

    constructor() {
        for (const method of ["GET", "POST", "PATCH", "DELETE", "PUT"]) {
            this[method] = (route: string, func: Function) => {
                this.tree.addRoute(`/${method}${route}`, func);
            }
        }
    }

    setRoute = (route: string) => {
        const tempURL = new URL(patchRoute(route));
        this.route = patchRoute(tempURL.pathname);
        this.routeQuery = new Map<string, string>();
        tempURL.searchParams.forEach((value: string, key: string) => {
            if (value.at(value.length-1) == "/") {
                value = value.slice(0, value.length-1);
            }
            this.routeQuery.set(key, value);
        });
        if (this.route.includes(".")) {
            this.fileExtension = this.route.split(".").pop();
            this.fileExtension = this.fileExtension.slice(0, this.fileExtension.length-1);
        }
        else this.fileExtension = null;
    }

    parseRoute = (method: string) => {
        const func = this.tree.getFunction(`/${method}${this.route}`);
        this.routeParams = this.tree.params;
        return func;
    }
}

class TrieNode {
    arr = new Array<TrieNode>(63);
    paramName: string;
    current: string;
    value: Function;
    params: Map<string, string>;

    constructor() {
        this.current = "";
        this.value = null;
        this.paramName = null;
    }

    addRoute = (route: string, func: Function) => {
        const splitedRoute = patchRoute(route).split("/");
        let node: TrieNode = this;
        splitedRoute.pop();
        splitedRoute.shift();
        splitedRoute.forEach(val => {
            val.split("").some(char => {
                let index = 0;
                if (char == ":"){
                    if (!node.arr[index]) {
                        node.arr[index] = new TrieNode();
                        node.arr[index].current = ':';
                        node.arr[index].paramName = val.replace(":", "");
                    }
                    node = node.arr[index];
                    return true;
                } else if (this.isUp(char)) {
                    index += 37 + (char.charCodeAt(0) - 'A'.charCodeAt(0));
                } else if (this.isLow(char)) {
                    index += 11 + (char.charCodeAt(0) - 'a'.charCodeAt(0));
                } else if (/^\d+$/.test(char)) {
                    index += 1 + (char.charCodeAt(0) - '0'.charCodeAt(0));
                }
                if (!node.arr[index]) {
                    node.arr[index] = new TrieNode();
                    node.arr[index].current = char;
                }
                node = node.arr[index];
                return false;
            })
        });
        node.value = func;
    }

    getFunction = (route: string) => {
        const splitedRoute = patchRoute(route).split("/");
        let node: TrieNode = this;
        splitedRoute.pop();
        splitedRoute.shift();
        let allowSkip = true;
        for (const element of splitedRoute) {
            if (node == undefined) return null;
            if (node.arr[0]?.current == ":"){ 
                if (allowSkip) {
                    node = node.arr[0];
                    if (!this.params) {
                        this.params = new Map<string, string>();
                    }
                    if (element.includes(".")) {
                        this.parseOndelimiter(".", node.paramName, element);
                    } else if (element.includes("-")) {
                        this.parseOndelimiter("-", node.paramName, element);
                    } else {
                        this.params.set(node.paramName, element);
                    }
                    allowSkip = false;
                    continue;
                }
            }
            element.split("").some(char => {
                let index = 0;
                if (this.isUp(char)) {
                    index += 37 + (char.charCodeAt(0) - 'A'.charCodeAt(0));
                } else if (this.isLow(char)) {
                    index += 11 + (char.charCodeAt(0) - 'a'.charCodeAt(0));
                } else if (/^\d+$/.test(char)) {
                    index += 1 + (char.charCodeAt(0) - '0'.charCodeAt(0));
                }
                if (node == undefined) return null;
                node = node.arr[index];
                allowSkip = true;
            });
        }
        return node?.value;
    }

    private parseOndelimiter = (delimit: string, route: string, vals: string) => {
        const splitedRoute = route.split(delimit);
        const splitedVals = vals.split(delimit);
        splitedRoute.forEach((_, index) => {
            this.params.set(splitedRoute[index].replace(":", ""), splitedVals[index]);
        });
    }

    private isUp = (char: string) => {
        return char == char.toUpperCase();
    }

    private isLow = (char: string) => {
        return char == char.toLowerCase();
    }
}