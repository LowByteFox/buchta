import { readFile, mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileExist } from "./buchta-utils";
import { marked } from "marked";

interface Config {
    webRootPath: string;
    cacheRootPath: string;
    imports: Map<string, string>;
}

export class Buchta {
    private routes: Map<string, Map<string, Function>>;
    private knownFiles: Map<string, string>;
    private _404Page: Function;
    private redirect: boolean;
    private redirectDest: string;
    private webRootPath: string;
    private cacheRootPath: string;
    private config: Config;

    public get: (route: string, func: (req?: Request) => {}) => {};
    public post: (route: string, func: (req?: Request) => {}) => {};
    public patch: (route: string, func: (req?: Request) => {}) => {};
    public delete: (route: string, func: (req?: Request) => {}) => {};
    public put: (route: string, func: (req?: Request) => {}) => {};
    
    constructor() {
        this.routes = new Map<string, Map<string, Function>>();
        this.knownFiles = new Map<string, string>();
        this.knownFiles.set("css", "text/css");
        this.knownFiles.set("js", "text/javascript");
        this.knownFiles.set("json", "text/json");
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
        this.redirect = false;
        
        try {
            this.config = JSON.parse(readFileSync("./buchta.config.json", { encoding: 'utf-8' }).toString())
        } catch {}

        this.config.webRootPath ? this.setWebRoot(this.config.webRootPath) : this.setWebRoot("./");
        this.config.cacheRootPath ? this.setCacheRoot(this.config.cacheRootPath) : this.setCacheRoot("./.cache/");

        for (const method of ["GET", "POST", "PATCH", "DELETE", "PUT"]) {
            this[method.toLowerCase()] = (route: string, func: Function) => {
                  const map = this.routes.get(method) || new Map<string, Function>();
                  map.set(route, func);
                  this.routes.set(method, map);
            }
          }
    }
    
    loadFile = (fileName: string, cache=false) => {
        return cache ? readFile(`${this.cacheRootPath}${fileName}`, {encoding:'utf8', flag:'r'}) : readFile(`${this.webRootPath}${fileName}`, {encoding:'utf8', flag:'r'});
    }

    loadByteFile = (fileName: string) => {
        return readFile(`${this.webRootPath}${fileName}`);
    }

    on404 = (func: Function) => this._404Page = func;

    setWebRoot = (path: string) => {
        this.webRootPath = path;
        if (this.webRootPath[path.length-1] != '/') {
            this.webRootPath += "/"
        }
    }
    setCacheRoot = (path: string) => {
        this.cacheRootPath = path;
        if (this.cacheRootPath[path.length-1] != '/') {
            this.cacheRootPath += "/"
        }
    }

    redirectTo = (url: string) => {
        this.redirect = true;
        this.redirectDest = url;
    }

    recursiveCacheCreate = async (rootBase: string, extra="") => {
        const dirs = rootBase.split("/");
        dirs.shift();
        dirs.pop();
        let baseDir = `${this.cacheRootPath}${extra}`;
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

    handleMarkdown = async (server: Buchta, base: string) => {
        let res: Response;
        if(await fileExist(`${server.cacheRootPath}`) && await fileExist(`${server.cacheRootPath}${base.replace(".md", ".html")}`)) {
            res =  new Response(await server.loadFile(`${base.replace(".md", ".html")}`, true));
        } else {
            const transpiled = marked.parse(await server.loadFile(base));
            res =  new Response(transpiled);
            await server.recursiveCacheCreate(base);
            await writeFile(`${server.cacheRootPath}${base.replace(".md", ".html")}`, transpiled, {encoding:'utf8', flag: 'w'});
        }
        res.headers.append("content-type", "text/html; charset=UTF-8");
        return res;
    }

    handleTypescript = async (server: Buchta, base: string) => {
        let res: Response;
        if(await fileExist(`${server.cacheRootPath}`) && await fileExist(`${server.cacheRootPath}${base.replace(".ts", ".js")}`)) {
            res =  new Response(await server.loadFile(`${base.replace(".ts", ".js")}`, true));
        } else {
            const transpiler = new Bun.Transpiler({ loader: "ts" });
            const transpiled = await transpiler.transform(await server.loadFile(base));
            res =  new Response(transpiled);
            await server.recursiveCacheCreate(base);
            await writeFile(`${server.cacheRootPath}${base.replace(".ts", ".js")}`, transpiled, {encoding:'utf8', flag: 'w'});
        }
        res.headers.append("content-type", "text/javascript");
        return res;
    }

    patchReact = async (server: Buchta, splited: string[]) => {
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
                for (const key in server.config.imports) {
                    if (tempLine == key) {
                        splited[i] = splited[i].replace(tempLine, server.config.imports[tempLine]);
                    }
                }
            }
        }
    }

    handleReact = async (server: Buchta, base: string) => {
        let res: Response;
        if(await fileExist(`${server.cacheRootPath}react/`) && await fileExist(`${server.cacheRootPath}react/${base.replace(".tsx", ".js").replace(".jsx", ".js")}`)) {
            res =  new Response(await server.loadFile(`react/${base.replace(".tsx", ".js").replace(".jsx", ".js")}`, true));
        } else {
            const transpiler = new Bun.Transpiler({ loader: "jsx" });
            let transpiled = await transpiler.transform(await server.loadFile(base));
            const splited = transpiled.split("\n");
            splited.pop();
            server.patchReact(server, splited);
            transpiled = splited.join("\n");
            transpiled += "\nfunction jsx(name, data, _g1, _g2, _g3, _g4) { return createElement(name, data); }"
            res =  new Response(transpiled);
            await server.recursiveCacheCreate(base, "react/");
            await writeFile(`${server.cacheRootPath}react/${base.replace(".tsx", ".js").replace(".jsx", ".js")}`, transpiled, {encoding:'utf8', flag: 'w'});
        }
        res.headers.append("content-type", "text/javascript");
        return res;
    }

    run = (serverPort: number = 3000, func?: Function, server=this) => {
        Bun.serve({
            async fetch(req: Request) : Promise<Response> {
                let res: Response;
                const base = req.url.slice(this.hostname.length-1, req.url.length);
                const fName = base.split(".").pop();
                if (server.routes.get(req.method)?.has(base)) {
                    res = new Response(await server.routes.get(req.method).get(base)(req));
                    res.headers.append("content-type", "text/html; charset=UTF-8");
                    return res;
                } else {
                    if (base.includes(".") && fName != "ts" && fName != "md" && fName != "jsx" && fName != "tsx" && server.knownFiles.has(fName)) {
                        if (server.knownFiles.get(fName).includes("image")) {
                            res =  new Response(await server.loadByteFile(base));
                        } else {
                            res =  new Response(await server.loadFile(base));
                        }
                        res.headers.append("content-type", server.knownFiles.get(fName));
                        return res;
                    } else if (fName == "ts") {
                        return server.handleTypescript(server, base);
                    } else if (fName == "md") {
                        return server.handleMarkdown(server, base);
                    } else if (fName == "jsx" || fName == "tsx") {
                        return server.handleReact(server, base);
                    } else {
                        res =  new Response(await server.loadFile(`${base}`));
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