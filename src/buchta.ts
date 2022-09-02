import { readFile, mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileExist } from "./buchta-utils";
import { marked } from "marked";
import { BuchtaLogger } from "./buchta-logger";
import { exit } from "node:process";
import { BuchtaRouter } from "./buchta-router";

interface Config {
    webRootPath: string;
    cacheRootPath: string;
    imports: Map<string, string>;
}

export class Buchta {
    private routes: Map<string, Map<string, Function>>;
    private experimentalRoutes: Array<String>;
    private knownFiles: Map<string, string>;
    private _404Page: Function;
    private redirect: boolean;
    private redirectDest: string;
    private webRootPath: string;
    private cacheRootPath: string;
    private config: Config;
    private logger: BuchtaLogger;
    private debug: boolean;
    private stopIE: boolean;
    private router: BuchtaRouter;

    public get: (route: string, func: (req?: Request) => {}, experimental?: boolean) => {};
    public post: (route: string, func: (req?: Request) => {}, experimental?: boolean) => {};
    public patch: (route: string, func: (req?: Request) => {}, experimental?: boolean) => {};
    public delete: (route: string, func: (req?: Request) => {}, experimental?: boolean) => {};
    public put: (route: string, func: (req?: Request) => {}, experimental?: boolean) => {};
    
    constructor(configPath?: string) {
        this.routes = new Map<string, Map<string, Function>>();
        this.experimentalRoutes = new Array<string>();
        this.knownFiles = new Map<string, string>();
        this.logger = new BuchtaLogger();
        this.router = new BuchtaRouter();

        this.logger.info("Buchta went to oven and met Bun. Both of them started talking about HTTP");

        this.knownFiles.set("css", "text/css");
        this.knownFiles.set("js", "text/javascript");
        this.knownFiles.set("json", "application/json");
        this.knownFiles.set("png", "image/png");
        this.knownFiles.set("apng", "image/apng");
        this.knownFiles.set("avif", "image/avif");
        this.knownFiles.set("gif", "image/gif");
        this.knownFiles.set("jpeg", "image/jpeg");
        this.knownFiles.set("jpg", "image/jpeg");
        this.knownFiles.set("jfif", "image/jpeg");
        this.knownFiles.set("pjpeg", "image/jpeg");
        this.knownFiles.set("pjp", "image/jpeg");
        this.knownFiles.set("svg", "image/svg+xml");
        this.knownFiles.set("webp", "image/webp");
        this.knownFiles.set("ico", "image/x-icon");
        this.knownFiles.set("mp4", "video/mp4");
        this.knownFiles.set("webm", "video/webm");
        this.knownFiles.set("mov", "video/mov");
        this.knownFiles.set("mp3", "audio/mp3");
        this.knownFiles.set("flac", "audio/flac");
        this.knownFiles.set("ogg", "audio/ogg");
        this.knownFiles.set("wav", "audio/wav");
        this.knownFiles.set("wasm", "application/wasm");
        this.redirect = false;
        this.debug = false;
        
        try {
            this.logger.info("Parsing buchta.config.json for configuration");
            this.config = JSON.parse(readFileSync("./buchta.config.json", { encoding: 'utf-8' }).toString())
            this.logger.success("Buchta managed to load configuration");
        } catch {
            if (configPath != undefined) {
                this.logger.warning("Couldn't find buchta.config.json, using 'configPath'");
                try {
                    this.config = JSON.parse(readFileSync(configPath, { encoding: 'utf-8' }).toString())
                    this.logger.success("Buchta managed to load configuration.");
                } catch {
                    this.logger.error("Buchta didn't find buchta.config.json, please start server where configuration file is located, or write it's path as parameter.");
                    exit(1);
                }
            } else {
                this.logger.error("Buchta didn't find buchta.config.json, please start server where configuration file is located, or write it's path as parameter.");
                exit(1);
            }
        }

        this.config.webRootPath ? this.setWebRoot(this.config.webRootPath) : this.setWebRoot("./");
        this.config.cacheRootPath ? this.setCacheRoot(this.config.cacheRootPath) : this.setCacheRoot("./.cache/");
        this.blockInternetExplorer(true);

        for (const method of ["GET", "POST", "PATCH", "DELETE", "PUT"]) {
            this[method.toLowerCase()] = (route: string, func: Function, experimental=false) => {
                  const map = this.routes.get(method) || new Map<string, Function>();
                  this.logger.info(`Registering route '${route}' with method ${method}`);
                  map.set(route, func);
                  this.routes.set(method, map);
                  if (experimental) {
                    this.logger.warning(`Route '${route}' has been set as EXPERIMENTAL, this route will use new BuchtaRouter. This feature is yet unfinished, be careful.`);
                    this.logger.warning("BuchtaRouter can parse routes similar to https://expressjs.com/en/guide/routing.html");
                    this.experimentalRoutes.push(route);
                  }
            }
        }
    }
    
    loadFile = (fileName: string, cache = false) => {
        fileName = fileName.replaceAll("//", "/");
        this.logger.info(`Loading file ${fileName}${cache ? " from cache" : ""}`);
        return cache ? readFile(`${this.cacheRootPath}${fileName}`, {encoding:'utf8', flag:'r'}) : readFile(`${this.webRootPath}${fileName}`, {encoding:'utf8', flag:'r'});
    }

    safeFileLoader = async (fileName: string, cache = false) => {
        try {
            return new Response(await this.loadFile(fileName, cache));
        } catch(e) {
            this.logger.error(e);
            return new Response(e);
        }
    }

    enableDebug = (enabled: boolean) => {
        enabled ? this.logger.warning("Debug mode enabled, nothing will be cached") : this.logger.info("Disabling Debug mode");
        this.debug = enabled;
    }

    blockInternetExplorer = (enabled: boolean) => {
        enabled ? this.logger.info("Now Internet Explorer users won't have access. They should know that IE is deprecated") : this.logger.info("If you app supports IE, then everything is good");
        this.stopIE = enabled;
    }

    loadByteFile = (fileName: string) => {
        fileName = fileName.replaceAll("//", "/");
        this.logger.info(`Loading byte file ${fileName}`);
        return readFile(`${this.webRootPath}${fileName}`);
    }

    on404 = (func: Function) => {
        this.logger.info("Registering 404 page");
        this._404Page = func;
    }

    setWebRoot = (path: string) => {
        this.logger.info(`Setting 'webRootPath' to ${path}`);
        this.webRootPath = path;
        if (this.webRootPath[path.length-1] != '/') {
            this.webRootPath += "/"
        }
        this.webRootPath = this.webRootPath.replaceAll("//", "/");
    }

    setCacheRoot = (path: string) => {
        this.logger.info(`Setting 'cacheRootPath' to ${path}`);
        this.cacheRootPath = path;
        if (this.cacheRootPath[path.length-1] != '/') {
            this.cacheRootPath += "/"
        }
        this.cacheRootPath = this.cacheRootPath.replaceAll("//", "/");
    }

    redirectTo = (url: string) => {
        this.logger.info(`Redirecting user to ${url}`);
        this.redirect = true;
        this.redirectDest = url;
    }

    recursiveCacheCreate = async (rootBase: string, extra="") => {
        this.logger.info(`Creating cache for '${rootBase}${extra}'`);
        const dirs = rootBase.split("/");
        dirs.shift();
        dirs.pop();

        let baseDir = this.cacheRootPath;
        if (!await fileExist(baseDir)) {
            await mkdir(baseDir);
        }

        baseDir += extra;
        if (!await fileExist(baseDir)) {
            await mkdir(baseDir);
        }

        for (const dir of dirs) {
            baseDir += `${dir}/`;
            if (!await fileExist(baseDir)) {
                await mkdir(baseDir);
            }
        }
    }

    handleMarkdown = async (base: string) => {
        this.logger.info("Transpiling markdown to html");
        let res: Response;
        if(await fileExist(`${this.cacheRootPath}`) && await fileExist(`${this.cacheRootPath}${base.replace(".md", ".html")}`)) {
            res =  new Response(await this.loadFile(`${base.replace(".md", ".html")}`, true));
        } else {
            let transpiled: string;
            try {
                transpiled = marked.parse(await this.loadFile(base));
            } catch(e) {
                this.logger.warning(e);
            }
            res =  new Response(transpiled);
            if (!this.debug) {
                await this.recursiveCacheCreate(base);
                await writeFile(`${this.cacheRootPath}${base.replace(".md", ".html")}`, transpiled, {encoding:'utf8', flag: 'w'});
            }
        }
        res.headers.append("content-type", "text/html; charset=UTF-8");
        this.logger.success("Markdown transpiled to html");
        return res;
    }

    handleTypescript = async (base: string) => {
        this.logger.info("Transpiling typescript to javascript");
        let res: Response;
        if(await fileExist(`${this.cacheRootPath}`) && await fileExist(`${this.cacheRootPath}${base.replace(".ts", ".js")}`)) {
            res =  new Response(await this.loadFile(`${base.replace(".ts", ".js")}`, true));
        } else {
            const transpiler = new Bun.Transpiler({ loader: "ts" });
            let transpiled = await transpiler.transform(await this.loadFile(base));
            const splited = transpiled.split("\n");
            if (splited[splited.length-1] == "") splited.pop();
            this.patchImports(splited);
            transpiled = splited.join("\n");
            res =  new Response(transpiled);
            if (!this.debug) {
                await this.recursiveCacheCreate(base);
                await writeFile(`${this.cacheRootPath}${base.replace(".ts", ".js")}`, transpiled, {encoding:'utf8', flag: 'w'});
            }
        }
        res.headers.append("content-type", "text/javascript");
        this.logger.success("Typescript transpiled to javascript");
        return res;
    }

    patchImports = async (splited: string[]) => {
        for (let i = 0; i < splited.length; i++) {
            if (splited[i].startsWith("import") || splited[i].includes("require")) {
                let tempLine;
                if (splited[i].includes('\'')) {
                    tempLine = splited[i].slice(splited[i].indexOf('\''), splited[i].length);
                    tempLine = tempLine.slice(0, tempLine.indexOf('\''));
                } else if (splited[i].includes('"')) {
                    tempLine = splited[i].slice(splited[i].indexOf('"')+1, splited[i].length);
                    tempLine = tempLine.slice(0, tempLine.indexOf('"'));
                }
                for (const key in this.config.imports) {
                    if (tempLine == key) {
                        splited[i] = splited[i].replace(tempLine, this.config.imports[tempLine]);
                    }
                }
            }
        }
    }

    handleReact = async (base: string) => {
        this.logger.info("Handling react");
        let res: Response;
        if(await fileExist(`${this.cacheRootPath}react/`) && await fileExist(`${this.cacheRootPath}react/${base.replace(".tsx", ".js").replace(".jsx", ".js")}`)) {
            res =  new Response(await this.loadFile(`react/${base.replace(".tsx", ".js").replace(".jsx", ".js")}`, true));
        } else {
            const transpiler = new Bun.Transpiler({ loader: "jsx" });
            let transpiled: string;
            try {
                transpiled = await transpiler.transform(await this.loadFile(base));
            } catch (e) {
                this.logger.warning(e);
                return new Response(e);
            }
            const splited = transpiled.split("\n");
            if (splited[splited.length-1] == "") splited.pop();
            this.patchImports(splited);
            transpiled = splited.join("\n");
            transpiled += `\nfunction jsx(name, data, _g1, _g2, _g3, _g4) { return createElement(name, data); }`
            res =  new Response(transpiled);
            if (!this.debug) {
                await this.recursiveCacheCreate(base, "react/");
                await writeFile(`${this.cacheRootPath}react/${base.replace(".tsx", ".js").replace(".jsx", ".js")}`, transpiled, {encoding:'utf8', flag: 'w'});
            }
        }
        res.headers.append("content-type", "text/javascript");
        this.logger.success("React.js handled");
        return res;
    }

    loadByMIME = async (base: string, fName: string) => {
        const temp = this.knownFiles.get(fName);
        if (temp?.includes("image") || temp?.includes("audio") || temp?.includes("video") || temp?.includes("wasm")) {
            return new Response(await this.loadByteFile(base));
        } else {
            if (fName == "js") {
                const data = await this.loadFile(base);
                const splited = data.split("\n");
                if (splited[splited.length-1] == "") splited.pop();
                this.patchImports(splited);
                return new Response(splited.join("\n"));
            } else {
                return this.safeFileLoader(base);
            }
        }
    }

    loadRoute = async (req: Request) => {
        let res: Response;
        req["query"] = this.router.query;
        this.logger.info(`Loading content of ${this.router.base}`);
        const str = await this.routes.get(req.method).get(this.router.base)(req);
        try {
            res = new Response(JSON.stringify(JSON.parse(str)));
            res.headers.append("content-type", "application/json");
        } catch(e) {
            this.logger.warning("This page is probably not a json, loading normally");
            res = new Response(str);
            res.headers.append("content-type", "text/html; charset=UTF-8");
        }
                    
        return res;
    }

    run = (serverPort: number = 3000, func?: Function, server=this) => {
        Bun.serve({
            async fetch(req: Request) : Promise<Response> {
                let res: Response;
                if (server.stopIE) {
                    if (req.headers.get("user-agent")?.includes("Trident")) {
                        return new Response("This website doesn't support Internet Explorer. Switch to more modern browser than that you have right now",
                        {headers: {"content-type": "text/html"}});
                    }
                }

                server.router.parseURLbase(req.url);
                const base = server.router.base;
                const fName = server.router.fileName;

                for (const element of server.experimentalRoutes) {
                    if (element.slice(0, element.lastIndexOf('/')) == base.slice(0, base.lastIndexOf('/'))) { 
                        server.router.parseRoute(element.toString(), base);
                        req["query"] = server.router.query;
                        req["params"] = server.router.params;
                        const str = await server.routes.get(req.method).get(element.toString())(req);
                        try {
                            res = new Response(JSON.stringify(JSON.parse(str)));
                            res.headers.append("content-type", "application/json");
                        } catch(e) {
                            server.logger.warning("This page is probably not a json, loading normally");
                            res = new Response(str);
                            res.headers.append("content-type", "text/html; charset=UTF-8");
                        }
                                    
                        return res;
                    }
                }

                if (server.routes.get(req.method)?.has(server.router.base)) {
                    return server.loadRoute(req);
                } else {
                    if (base.includes(".") && fName != "ts" && fName != "md" && fName != "jsx" && fName != "tsx" || server.knownFiles.has(fName)) {
                        res = await server.loadByMIME(base, fName);
                        res.headers.append("content-type", server.knownFiles.has(fName) ? server.knownFiles.get(fName) : "text/plain");
                        return res;
                    } else if (fName == "ts") {
                        return server.handleTypescript(base);
                    } else if (fName == "md") {
                        return server.handleMarkdown(base);
                    } else if (fName == "jsx" || fName == "tsx") {
                        return server.handleReact(base);
                    } else {
                        res = await server.safeFileLoader(base);
                        res.headers.append("content-type", `text/plain`);
                    }
                }
                res = server._404Page ? new Response(server._404Page(req)) : new Response("404 sad bun");
                res.headers.append("content-type", "text/html; charset=UTF-8");
                if (server.redirect) {
                    server.redirect = false;
                    return Response.redirect(server.redirectDest);
                } else return res;
            },
            port: serverPort
        });
        func?.();
        
    }
}