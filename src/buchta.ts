import { BuchtaRouter } from "./buchta-router";
import { BuchtaRequest } from "./buchta-request";
import { BuchtaResponse } from "./buchta-response";
import { readdir, readFileSync } from "fs";
import { readFile } from "fs/promises";
import { exit } from "process";
import { BuchtaTranspiler } from "./buchta-transpiler";
import { BuchtaCache } from "./buchta-cache";

interface Config {
    webRootPath: string;
    cacheRootPath: string;
    imports: Map<string, string>;
}

export class Buchta {
    private router = new BuchtaRouter();
    // not needed private logger = new BuchtaLogger();
    private config: Config;
    private transpiler: BuchtaTranspiler;
    private fileExtensionDb: Map<string, string>;
    private cacheHandler: BuchtaCache;

    get: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    post: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    patch: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    delete: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};
    put: (route: string, func: (req: BuchtaRequest, res: BuchtaResponse) => void) => {};

    every = (route: string, data: {methods: Array<string>, funcs: Array<(req: BuchtaRequest, res: BuchtaResponse) => void>}) => {
        let i = 0;
        for (const element of data.methods) {
            if (data.funcs[i] == undefined) {
                break;
            }
            this[element.toLowerCase()](route, data.funcs[i]);
            i++;
        }
    }

    constructor(configPath?: string) {

        this.fileExtensionDb = new Map<string, string>();

        this.registerMIME(
            ["html", "css", "js", "json", "png", "apng", "avif", "gif", "jpeg", "jpg", "svg", "webp", "ico", "mp4", "webm", "mov",
             "mp3", "flac", "ogg", "wav", "wasm", "ts", "mjs", "mts", "jsx", "tsx", "svelte", "vue", "md"],
            ["text/html; charset=UTF-8", "text/css", "text/javascript", "application/json",
             "image/png", "image/apng", "image/avif", "image/gif", "image/jpeg", "image/jpeg",
             "image/svg+xml", "image/webp", "image/x-icon", "video/mp4", "video/webm", "video/mov",
             "audio/mp3", "audio/flac", "audio/ogg", "audio/wav", "application/wasm", "text/javascript",
             "text/javascript", "text/javascript", "text/javascript", "text/javascript", "text/javascript", "text/javascript", "text/html; charset=UTF-8"]
        );

        try {
            this.config = JSON.parse(readFileSync("./buchta.config.json", { encoding: 'utf-8' }).toString())
        } catch {
            if (configPath != undefined) {
                try {
                    this.config = JSON.parse(readFileSync(configPath, { encoding: 'utf-8' }).toString())
                } catch {
                    exit(1);
                }
            } else {
                console.log("buchta.config.json doesn't exist or it's broken");
                exit(1);
            }
        }
        this.cacheHandler = new BuchtaCache(this.config.cacheRootPath);

        this.transpiler = new BuchtaTranspiler(this.config.imports, this.cacheHandler);

        this.config.webRootPath ? this.setWebRoot(this.config.webRootPath) : this.setWebRoot("./");
        this.config.cacheRootPath ? this.setCacheRoot(this.config.cacheRootPath) : this.setCacheRoot("./.cache/");

        ["GET", "POST", "PATCH", "DELETE", "PUT"].forEach(val => {
            this[val.toLowerCase()] = (route: string, func: Function) => {
                this.router[val](route, func);
            }
        });

        this.autoRoute(this.config.webRootPath);
    }

    private autoRoute = (path: string) => {
        readdir(path, (_err, files, server=this) => {
            files.forEach(val => {
                if (!val.startsWith("_")) {
                    if (!val.includes(".")) {
                        val = server.patchRoute(path + val);
                        server.autoRoute(val);
                    }
                    if (val.includes(server.config.webRootPath)) {
                        val = val.replace(server.config.webRootPath, "");
                    }
                    if (val.startsWith("App") && val.match("html|jsx|tsx|svelte|vue|md")) {
                        const filePath = "/" + (path + val).replace(server.config.webRootPath, "");
                        const fileRoute = filePath.split("/");
                        fileRoute.pop();
                        server.get(fileRoute.join("/") + "/", async (_req, res) => {
                            await server.handleMIME(res, filePath + "/", fileRoute.join("/").split(".").pop(), true);
                        });
                    } else if (val.includes(".")) {
                        const filePath = "/" + (path + val).replace(server.config.webRootPath, "");
                        server.get(filePath.replace(server.config.webRootPath, "/"), async (_req, res) => {
                            await server.handleMIME(res, filePath + "/", filePath.split(".").pop());
                        })
                    }
                }
            })
        });
    }

    private patchRoute = (route: string) => {
        let copy = route.replaceAll("//", "/");
        if (copy[copy.length-1] != "/") {
            copy += "/";
        }
        return copy;
    }

    setWebRoot = (path: string) => {
        this.config.webRootPath = path;
        if (this.config.webRootPath[path.length-1] != '/') {
            this.config.webRootPath += "/"
        }
        this.config.webRootPath = this.config.webRootPath.replaceAll("//", "/");
    }

    setCacheRoot = (path: string) => {
        this.config.cacheRootPath = path;
        if (this.config.cacheRootPath[path.length-1] != '/') {
            this.config.cacheRootPath += "/"
        }
        this.config.cacheRootPath = this.config.cacheRootPath.replaceAll("//", "/");
    }

    registerMIME = (fileExtensions: Array<string>, contentTypes: Array<string>) => {
        fileExtensions.forEach((val, index) => {
            this.fileExtensionDb.set(val, contentTypes[index]);
        });
    }

    handleMIME = async (res: BuchtaResponse, path: string, fileExtension: string, isApp=false) => {
        const filePath = path.slice(0, path.length-1);
        const contentType = this.fileExtensionDb.get(fileExtension);
        if (filePath.endsWith("mts") || filePath.endsWith("mjs")) {
            const cacheData = this.cacheHandler.handleCache(filePath, null, "js");
            if (cacheData) {
                res.send(cacheData);
                return;
            }
            res.send(await this.transpiler.transpileTs(await readFile(this.config.webRootPath + filePath, {encoding: "utf-8"}), filePath));
        } else if (filePath.endsWith("jsx") || filePath.endsWith("tsx")) {
            let cacheData: string | null;

            if (filePath.match("App.jsx|App.tsx")) {
                cacheData = this.cacheHandler.handleCache(filePath, null, "html");
            } else {
                cacheData = this.cacheHandler.handleCache(filePath, null, "js");
            }

            if (cacheData) {
                res.send(cacheData);
                return;
            }
            res.send(await this.transpiler.transpileJsx(await readFile(this.config.webRootPath + filePath, {encoding: "utf-8"}), filePath));
        } else if (filePath.endsWith("ts")) {
            const cacheData = this.cacheHandler.handleCache(filePath, null, "js");
            if (cacheData) {
                res.send(cacheData);
                return;
            }
            res.send(await this.transpiler.transpileTs(await readFile(this.config.webRootPath + filePath, {encoding: "utf-8"}), filePath));
        } else if (filePath.endsWith("svelte")) {
            let cacheData: string | null;

            if (filePath.match("App.svelte")) {
                cacheData = this.cacheHandler.handleCache(filePath, null, "html");
            } else {
                cacheData = this.cacheHandler.handleCache(filePath, null, "js");
            }

            if (cacheData) {
                res.send(cacheData);
                return;
            }
            res.send(await this.transpiler.transpileSvelte(await readFile(this.config.webRootPath + filePath, {encoding: "utf-8"}), filePath));
        } else if (filePath.endsWith("md")) {
            const cacheData = this.cacheHandler.handleCache(filePath, null, "html");
            if (cacheData) {
                res.send(cacheData);
                return;
            }
            res.send(await this.transpiler.transpileMarkdown(await readFile(this.config.webRootPath + filePath, {encoding: "utf-8"}), filePath));
        } else if (filePath.endsWith("vue")) {
            let cacheData: string | null;

            if (filePath.match("App.vue")) {
                cacheData = this.cacheHandler.handleCache(filePath, null, "html");
            } else {
                cacheData = this.cacheHandler.handleCache(filePath, null, "js");
            }

            if (cacheData) {
                res.send(cacheData);
                return;
            }
            res.send(await this.transpiler.transpileVue(await readFile(this.config.webRootPath + filePath, {encoding: "utf-8"}), filePath));
        } else {
            res.sendFile(filePath);
        }
        if (isApp) {
            res.headers.set("content-type", this.fileExtensionDb.get("html"));
        } else {
            res.headers.set("content-type", contentType);
        }
    }

    run = (serverPort: number = 3000, func?: Function, server=this) => {
        Bun.serve({
            async fetch(req: Request) : Promise<Response> {
                server.router.setRoute(req.url);
                const func = server.router.parseRoute(req.method);
                const buchtaRes = new BuchtaResponse(server.config.webRootPath);
                if (func) {
                    const buchtaReq = new BuchtaRequest(req, server.router.routeQuery, server.router.routeParams);
                    await func(buchtaReq, buchtaRes);
                    return buchtaRes.constructResponse();
                } else {
                    if (server.router.fileExtension) {
                        server.handleMIME(buchtaRes, server.router.route, server.router.fileExtension);
                        return buchtaRes.constructResponse();
                    }
                }
                return new Response("¯\\_(ツ)_/¯ unknown route", {headers: {"content-type": "text/html; charset=UTF-8"}});
            },
            port: serverPort
        });
        console.log("Buchta entered oven and met Bun. Both of them started talking about HTTP")
        func?.();
    }
}