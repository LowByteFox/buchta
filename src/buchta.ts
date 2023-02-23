import { Router, route } from "./router";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";
import { BuchtaBundler } from "./bundler";

import { readdir } from "fs/promises";
import { basename, dirname, relative, resolve } from "path";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { BuchtaSubrouter } from "./utils/subrouter";
import { colors, customLog } from "./utils/colors";
import { fswatch } from "./utils/fswatch";
import { chdir, exit } from "process";
import { errorPage } from "./utils/pages";
import { awaitImportRegex, cjsModuleRegex, esModuleRegex, esNormalModule } from "./utils/utils";
import { match } from "assert";

const mimeLook = require("mime-types");

export class Buchta {
    [x: string]: any;
    private router: Router = new Router();
    private templater = new Map<string, string>();
    private config: any;
    bundler: BuchtaBundler;
    port: number;
    private afterRouting: Array<Function> = [];
    private fextHandlers: Map<string, Function> = new Map();
    private wsOpen: Array<Function> = [];
    private wsMessage: Array<Function> = [];
    private wsClose: Array<Function> = [];
    private registerToBuild: Array<any> = [];
    private apisToBuild: Array<string> = [];
    private middleToBuild: Array<string> = [];
    private soonImports: Array<Array<string>> = [];
    private composables: Map<string, any> = new Map();
    enableWs = true;
    routeIndex = "index";
    buildMode = false;

    get: route;
    post: route;
    put: route;
    delete: route;

    constructor(config?: any, buildMode = false) {
        const methods = ["get", "post", "put", "delete"];
        for (const method of methods) {
            this[method] = (path: string, handler: (req: BuchtaRequest, res: BuchtaResponse) => void, data: any) => {
                this.router[method](path, handler);
                if (data) {
                    for (const func of this.afterRouting) {
                        func.call(this, {
                            data,
                            method,
                            path,
                        });
                    }
                }
            };
        }

        this.buildMode = buildMode;

        try {
            this.config = config ?? require(process.cwd() + "/buchta.config.ts").default;
        } catch (e) {
            console.log(e);
        }

        if (this.config?.ws?.enable) {
            this.enableWs = this.config.ws.enable;
        }

        if (this.config?.plugins) {
            for (const plugin of this.config.plugins) {
                this.mixInto(plugin);
            }
        }
        
        (async (methods) => {
            await this.autoLoad(methods);
        })(methods);
    }

    async autoLoad(methods) {
        if (this.config) {
            if (!this.config.rootDirectory) return;
            await this.handleComposables(this.config.rootDirectory + "/composables");

            const rootDir = this.config.rootDirectory + "/public";
            if (!existsSync(rootDir)) this.ERROR("Missing directory: \"public\"\n")
            const rootDirFiles = await this.getFiles(rootDir);
            this.bundler = new BuchtaBundler(rootDir);
            this.bundler.prepare();
            rootDirFiles.forEach(async (file: string) => {
                const route = file.substring(rootDir.length).replace("[", ":").replace("]", "");
                const shortenedFile  = basename(route);
                await this.handleFile(shortenedFile, route, file, methods);
                if (this.livereload) {
                    fswatch(file, null, async () => {
                        for (const f of this.livereload.onUpdate) {
                            f(file);
                        }
                        await this.handleFile(shortenedFile, route, file, methods);
                        this.bundleProject(true);
                        this.livereload.clients.forEach(client => {
                            client.send("YEEET!");
                        })
                    });
                }
            });

            this.bundleProject();

            const templateDir = `${this.config.rootDirectory}/templates`;
            if (existsSync(templateDir)) {
                const templateDirFiles = await this.getFiles(templateDir);
                templateDirFiles.forEach(template => {
                    const file = template.slice(templateDir.length + 1);
                    this.templater.set(file, readFileSync(template, {encoding: "utf-8"}));
                })
            }

            await this.handleMiddlewares(this.config.rootDirectory + "/middleware", methods);
            await this.handleStaticFiles(this.config.rootDirectory + "/static");
        }
    }

    async handleComposables(path: string) {
        if (!existsSync(path)) return;
        const files = await this.getFiles(path);
        for (const file of files) {
            if (!/(.js|.ts)$/.exec(file)) {
                this.ERROR(`Skipping file: ${file}, because it is not .js or .ts file!`);
            } else {
                const module = await import(file);
                const name = basename(file).split(".").shift();
                const val = module?.default();
                if (val?.res) await val.res;

                this.composables.set(name, val);
            }
        }
    }

    public generateComposables = () => {
        let code = '';
        for (const [key, el] of this.composables) {
            let chunk = `let ${key} = ${JSON.stringify(el, function(key, val) {
                if (typeof val === 'function') {
                  return val.toString().replaceAll("\n", "");
                }
                return val;
              }, "\t")};`
            if (el.constructor == [].constructor) {

            } else if (el.constructor == {}.constructor) {
                chunk = chunk.slice(0, -3) + ",\n};";
                for (const regex of [
                    /["']\s*\(.*\).+=>.+?(?=["'],)./g,
                    /["']\s*async\s*\(.*\).+=>.+?(?=["'],)./g,
                    /["']\s*function\s*\(.*\)\s*{.+?(?=["'],)./g,
                    /["']\s*async\s*function\s*\(.*\)\s*{.+?(?=["'],)./g
                ]) {
                    chunk = chunk.replace(regex, (match: string) => {
                        return match.slice(1, -1);
                    })
                }
            } else if (typeof el == "function") {
                for (const regex of [
                    /["']\s*\(.*\).+=>.+?(?=["'];)./g,
                    /["']\s*async\s*\(.*\).+=>.+?(?=["'];)./g,
                    /["']\s*function\s*\(.*\)\s*{.+?(?=["'];)./g,
                    /["']\s*async\s*function\s*\(.*\)\s*{.+?(?=["'];)./g
                ]) {
                    chunk = chunk.replace(regex, (match: string) => {
                        return match.slice(1, -1);
                    })
                }
            }

            code += chunk + "\n";
        }

        return code;
    }

    async handleMiddlewares(path: string, methods: string[]) {
        if (!existsSync(path)) return;
        const files = await this.getFiles(path);

        files.forEach(async file => {
            const route = dirname(file.slice(path.length));
            
            const imports = readFileSync(file, {encoding: "utf-8"}).match(esNormalModule);

            const module = await import(file);

            let code = "";

            methods.forEach(method => {
                if (module.before) {
                    code += `\nserver.addBefore("${route}", "${method}", ${module.before.toString().replace(/function .+?(?=\()/, "function")}, false)\n`;
                    this.router.addBefore(route, method, module.before, false);
                }
                if (module.after) {
                    code += `\nserver.addAfter("${route}", "${method}", ${module.after.toString().replace(/function .+?(?=\()/, "function")}, false)\n`;
                    this.router.addAfter(route, method, module.after, false);
                }
                this.middleToBuild.push(code);
                if (imports)
                    this.soonImports.push(imports);
                code = "";
            })
        })
    }

    async handleStaticFiles(path: string) {
        if (!existsSync(path)) return;
        const files = await this.getFiles(path);

        files.forEach(file => {
            const route = file.slice(path.length);
            
            this.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.sendFile(file);
            });
            this.registerToBuild.push(route);
        })
    }

    private bundleProject(quiet = false) {
        if (this.bundler.bundle()) {
            this.bundler.build(this, quiet);
        } else {
            for (const route of this.router.routes) {
                const method = route[0].split("/").shift();
                this.router[method](route[0].slice(method.length + 1), (_: any, s: BuchtaResponse) => {
                    s.send(errorPage("Gah, a crash! Fix the issue and restart the server! The bundler failed!"));
                    s.setHeader("Content-Type", "text/html; charset=utf-8");
                });
            }
            this.WARN("Gah, a crash! Fix the issue and restart the server! The bundler failed!\n");
        }
    }

    async handleFile(filename: string, route: string, path: string, methods: string[]) {
        const extension = filename.split(".").pop();
        if (filename.startsWith(this.routeIndex) && filename.endsWith(".html")) {
            this.registerToBuild.push(dirname(route));
            if (this.livereload) {
                let content = readFileSync(path, {encoding: "utf-8"});
                content += `
                <script>
                let socket = new WebSocket("ws://localhost:${this.getPort()}");

                socket.onmessage = (e) => { if (e.data == "YEEET!") window.location.reload(); }
                </script>
                `;

                this.get(dirname(route), (_req, res) => {
                    res.send(content);
                    res.setHeader("content-type", "text/html; charset=utf-8");
                });
            } else {
                this.get(dirname(route), (_req, res) => {
                    res.sendFile(path);
                });
            }
        } else if (filename.endsWith(".js") || filename.endsWith(".ts")) {
            if (filename.match(/.+\.server\.(ts|js)/)) {
                await this.handleServerFunction(filename, path, methods, route);
            } else {
                if (filename.startsWith("middleware")) {
                    this.WARN(`File 'public${route}' should be in 'middleware' directory, ignoring`);
                    return;
                }

                this.bundler.addFile(path);
                this.get(route, (_req, res) => {
                    res.sendFile(path);
                });
                this.registerToBuild.push(route);
            }
        } else {
            if (this.fextHandlers.has(extension)) {
                this.fextHandlers.get(extension)?.call(this, route, path);
                this.registerToBuild.push([route, extension]);
            } else {
                this.WARN(`File 'public${route}' should be in 'static' directory\n`);
                this.get(route, (_req, res) => {
                    res.sendFile(path);
                });
                this.registerToBuild.push(route);
            }
        }
    }

    private WARN(str: string) {
        customLog([colors.bold, colors.white], "[ ");
        customLog([colors.bold, colors.yellow], "WARN");
        customLog([colors.bold, colors.white], " ]: ");
        customLog([colors.bold, colors.white], str);
    }

    private ERROR(str: string) {
        customLog([colors.bold, colors.white], "[ ");
        customLog([colors.bold, colors.red], "ERROR");
        customLog([colors.bold, colors.white], " ]: ");
        customLog([colors.bold, colors.white], str);
    }

    async handleServerFunction(filename: string, path: string, methods: string[], route: string) {
        const firstPart = filename.split(".").shift();
        const method = methods.find(m => m == firstPart);
        if (method) {
            const module = await import(path);
            if (!module.default) return;

            const func = module?.default;

            if (func.constructor.name == "AsyncFunction") {
                this[method](dirname(route), async (req: BuchtaRequest, res: BuchtaRequest) => {
                    await func(req, res);
                });
            } else {
                this[method](dirname(route), (req: BuchtaRequest, res: BuchtaResponse) => {
                    func(req, res);
                });
            }

            let code = `server.${method}("${dirname(route)}", ${func.toString().replace(/function .+?(?=\()/, "function")})`;
            const imports = readFileSync(path, {encoding: "utf-8"}).match(esNormalModule);

            if (module.before) {
                code += `\nserver.addBefore("${dirname(route)}", "${method}", ${module.before.toString().replace(/function .+?(?=\()/, "function")}, true)`;
                this.router.addBefore(dirname(route), method, module.before, true);
            }

            if (module.after) {
                code += `\nserver.addAfter("${dirname(route)}", "${method}", ${module.after.toString().replace(/function .+?(?=\()/, "function")}, true)`;
                this.router.addAfter(dirname(route), method, module.after, true);
            }

            this.apisToBuild.push(code);
            if (imports)
                this.soonImports.push(imports);
        }
    }

    /**
     * Add a callback that will get executed after the route has been registered
     * @param {Function} callback - The function
     */
    assignAfterRouting(callback: Function) {
        this.afterRouting.push(callback);
    }

    /**
     * Add a callback that will get executed when FS routing detects specified extension
     * @param {string} ext - File extension
     * @param {Function} callback - The function
     */
    assignExtHandler(ext: string, callback: Function) {
        this.fextHandlers.set(ext, callback);
    }

    /**
     * Get template that can be used in plugin
     * @param {string} name - name of file, for example `svelte.html`
     * Returns content of `name` template stored in `templates` directory
     */
    getTemplate(name: string) {
        return this.templater.get(name);
    }

    /**
     * Returns fileName used for / routing: /index.html -> / ( index )
     */
    getDefaultFileName() {
        return this.routeIndex;
    }

    private async getFiles(dir: string) {
        const dirents = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = resolve(dir, dirent.name);
            return dirent.isDirectory() ? this.getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    }

    /**
     * Adds plugin made for Buchta
     * @param {Function} plugin - Function returned by plugin
     */
    mixInto(plugin: Function) {
        plugin.call(this);
    }

    /**
     * Returns root directory path
     */
    getRoot() {
        return this.config.rootDirectory;
    }

    /**
     * Returns port used for server
     */
    getPort() {
        return this.config.port;
    }

    /**
     * Add function that will be trigerred when websockets recieves message
     * @param {(ws: WebSocket, msg: String) => void} func - the function
     */
    wsOnMessage(func: (ws: WebSocket, msg: string) => void) {
        this.wsMessage.push(func);
    }

    /**
     * Add function that will be trigerred when client connects to websocket server
     * @param {(ws: WebSocket) => void} func - the function
     */
    wsOnOpen(func: (ws: WebSocket) => void) {
        this.wsOpen.push(func);
    }

    /**
     * Add function that will be trigerred when client disconnects to websocket server
     * @param {(ws: WebSocket) => void} func - the function
     */
    wsOnClose(func: (ws: WebSocket) => void) {
        this.wsClose.push(func);
    }

    use(path: string, router: BuchtaSubrouter) {
        router.putInto(this, path);       
    }

    /**
     * Run the server
     * @param {number} [serverPort=3000] - p    ort on which will the server run
     * @param {Function} [func=undefined] - function that will run after the server has started
     */
    run = (serverPort: number = 3000, func?: Function, server = this) => {
        server.port = this.config?.port || serverPort;

        let ws = {
            open: (ws: WebSocket) => {
                for (const fun of this.wsOpen) {
                    fun.call(this, ws);
                }
            },
            message: (ws: WebSocket, msg: string) => {
                for (const fun of this.wsMessage) {
                    fun.call(this, ws, msg);
                }
            },
            close: (ws: WebSocket) => {
                for (const fun of this.wsClose) {
                    fun.call(this, ws);
                }
            }
        };

        Bun.serve({
            // @ts-ignore wsServer bun-types issues
            async fetch(req: BuchtaRequest, wsServer: any = null): Promise<Response> {
                if (wsServer?.upgrade(req)) return;
                
                let path = decodeURI(req.url.match(/\d(?=\/).+/)[0].slice(1));
                let route;

                if (!path.includes("?")) {
                    route = server.router.handle(path, req.method.toLowerCase());
                } else {
                    const splited = path.split("?");

                    route = server.router.handle(splited[0], req.method.toLowerCase());
                    req.query = server.parseQuery(splited[1]);
                }
                
                if (!route)
                    return new Response(server.getTemplate("404.html") ?? "404", {status: 404, headers: {"Content-Type": "text/html; charset=utf-8;"}});
                req.params = server.router.params;
                req.originalRoute = route.path;

                const buchtaRes = new BuchtaResponse();

                let res: any;

                res = route.b?.(req, buchtaRes);
                if (res?.then) await res;

                if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()

                res = route.f(req, buchtaRes);
                if (res?.then) await res;

                if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()
                
                res = route.a?.(req, buchtaRes);
                if (res?.then) await res;

                if (buchtaRes.canRedirect()) return buchtaRes.buildRedirect()

                return buchtaRes.buildResponse();
            },
            port: serverPort,
            development: true,
            // @ts-ignore bun-ws missing types
            websocket: ws
        });
        console.log(`Buchta entered oven and met Bun. Both of them started talking about HTTP on port ${serverPort}`);
        func?.();
    }

    build() {
        this.run();

        console.log("\nWaiting 5s for server to fully load\n");

        setTimeout(async () => {
            console.log(
`                           
                     :===.                            
               ======#@@@*==========.                 
            :--***************%@@%%%+---              
          ::*##               +####*%@@%..            
          @@=                   =@%*****@@-           
       .==@@=    :========.     +@@%##**%%+=:         
       -@@**:  --*########=-:   -*%@@%##**%@*         
       -@@     %@+::::::::#@*     =@@%%%##%@*         
       -@@-----@@#++++++++%@#-----*@@%%%%%@@*         
      .-%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%@@@@#..       
     .@@@@%@@%%%@%@%%%%@%%%@%%%%%%%%%%@@@@@@@@#       
     .@%==================================#@@@%#*     
    **::                              ::--*@@@@@%##   
  **=-      =**              ****      .::=+#@@@@@@*+ 
  @@:       +##              ####         ::=%%@@@@## 
  @@:            *@%=   =@@:               .:-+@@*+   
 .@@:            -*********.                .:+@%     
 .@@:                                      :--+@%     
 .@@:                                     .:-=*@%     
 .@@=-::.                             ...:-=+%#-:     
  --##==--::::.          .       .::::--==*#*=:       
    :=%#=======-------:::---------======%%+-:         
      :=%%%%*+==============*%%%%%%%%%%%::.           
       .----#@@@@@@@@@@@@@@@#-----------             
`
            )
            console.log("\nExporting app\n");

            this.WARN("Buchta Build is still experimental feature! Not everything is being exported\n\n");

            let exportBase = process.cwd();
            exportBase += "/dist/";

            if (!existsSync(exportBase)) {
                mkdirSync(exportBase);
            }

            let serverCode = "import { Buchticka, BuchtickaResponse, BuchtickaRequest } from \"./buchticka\";\n"

            for (const imports of this.soonImports) {
                for (const imprt of imports) {
                    if (!/buchta/i.exec(imprt)) {
                        serverCode += "\n" + imprt + "\n";
                    }
                }
            }

            serverCode += "const server = new Buchticka();\n";

            chdir(exportBase);

            for (const path of this.registerToBuild) {
                if (path instanceof Array) {
                    const [pth, ext] = path;

                    if (!existsSync(dirname(pth))) {
                        mkdirSync("." + dirname(pth), {recursive: true});
                    }

                    if (basename(pth) == `${this.getDefaultFileName()}.${ext}`) {

                        const req = await fetch(`localhost:${this.getPort()}/${dirname(pth)}`);
                        let text: string | Blob = await req.blob();

                        if (!/\ufffd/.exec(await text.text())) {
                            text = this.replaceImports(await text.text());
                        }

                        serverCode += `
server.get("${dirname(pth)}", (r: any, s: any) => { s.sendFile(import.meta.dir + "/" + "${"." + pth.replace("." + ext, ".html")}"); s.setHeader("Content-Type", "text/html"); })`
                        if (typeof text == "string") writeFileSync("." + pth.replace("." + ext, ".html"), this.matchBundle(pth, text));
                    } else {
                        const req = await fetch(`localhost:${this.getPort()}/${pth}`);
                        const text = this.replaceImports(await req.text());
                        const ctype = req.headers.get("Content-Type").replace("text/javascript", "application/javascript");
                        const targetExt = mimeLook.extension(ctype);
                        const routePath = "." + pth.replace("." + ext, "." + targetExt);
                        if (targetExt) {
                            serverCode += `
server.get("${routePath.slice(1)}", (r: any, s: any) => { s.sendFile(import.meta.dir + "/" + "${routePath}"); s.setHeader("Content-Type", "${ctype}"); })`
                            if (/\ufffd/.exec(text)) {
                                writeFileSync(routePath, text);
                            } else {
                                writeFileSync(routePath, this.matchBundle(pth, text));
                            }
                        }
                    }
                } else {

                    if (!existsSync(dirname(path))) {
                        mkdirSync("." + dirname(path), {recursive: true});
                    }

                    
                    const req = await fetch(`localhost:${this.getPort()}/${path}`);
                    let text: string | Blob = await req.blob();

                    if (!/\ufffd/.exec(await text.text())) {
                        text = this.replaceImports(await text.text());
                    }

                    if (path.endsWith("/")) {
                        serverCode += `
server.get("${path}", (r: any, s: any) => { s.sendFile(import.meta.dir + "/" + "${"." + path + "index.html"}"); s.setHeader("Content-Type", "text/html"); })`
                        if (typeof text == "string") writeFileSync("." + path + "index.html", this.matchBundle(path, text));
                    } else {
                        serverCode += `
server.get("${path}", (r: any, s: any) => { s.sendFile(import.meta.dir + "/" + "${"." + path}"); s.setHeader("Content-Type", "${req.headers.get("Content-Type")}"); })`
                        if (typeof text != "string") {
                            writeFileSync("." + path, await text.arrayBuffer());
                        } else {
                            writeFileSync("." + path, this.matchBundle(path, text));
                        }
                    }
                }
            }

            const bundleReq = await fetch(`localhost:${this.getPort()}/buchta-build-bundle/`);
            const bundleText = await bundleReq.text();
            writeFileSync("bundle.js", bundleText);
            copyFileSync(import.meta.dir + "/buchticka.ts", "./buchticka.ts");
            serverCode += `
server.get("/bundle.js", (r: any, s: any) => { s.sendFile(import.meta.dir + "/" + "./bundle.js"); s.setHeader("Content-Type", "application/javascript"); })\n`

            for (const api of this.apisToBuild) {
                serverCode += "\n" + api + "\n";
            }
            
            for (const middle of this.middleToBuild) {
                serverCode += "\n" + middle + "\n";
            }
            
            writeFileSync("server.ts", `${serverCode}server.run(${this.getPort()})\n`);
            
            chdir("..");

            console.log("Done!");
            exit(0);
        }, 5000);
    }

    private replaceImports(code: string) {
        const split = code.split("\n");
        for (let i = 0; i < split.length; i++) {
            if (split[i].includes("import")) {
                const match = split[i].match(/(".+"|'.+')/);
                if (match && split[i].includes(".")) {
                    const base = match[0].slice(1, match[0].length - 1);
                    const splited = base.split(".");
                    splited.pop();
                    split[i] = split[i].replace(base, () => splited.join(".") + ".js");
                }
            }
        }
        return split.join("\n");
    }

    private matchBundle(path: string, code: string) {
        code.match(awaitImportRegex)?.forEach(match => {
            const file = match.match(/['"].+?(?=['"])/);
            if (file) {
                const fixed = file[0].slice(1);
                if (fixed.startsWith("/")) {
                    code = code.replace(fixed, () => "./" + relative(dirname(path), fixed));
                }
            }
        })

        code.match(cjsModuleRegex)?.forEach(match => {
            const file = match.match(/['"].+?(?=['"])/);
            if (file) {
                const fixed = file[0].slice(1);
                if (fixed.startsWith("/")) {
                    code = code.replace(fixed, () => "./" + relative(dirname(path), fixed));
                }
            }
        })

        code.match(esModuleRegex)?.forEach(match => {
            if (match.includes("/buchta-build-bundle/")) return;

            const file = match.match(/['"].+?(?=['"])/);
            if (file) {
                const fixed = file[0].slice(1);
                if (fixed.startsWith("/")) {
                    code = code.replace(fixed, () => "./" + relative(dirname(path), fixed));
                }
            }
        });

        return code.replaceAll("/buchta-build-bundle/", () => "./" + relative(dirname(path), "/bundle.js"));
    }

    parseQuery(path: string) {
        const query = new Map<string, string>();
        const splited = path.split("&");
        splited.forEach(part => {
            const spaced = part.split("=");
            if (!query.has(spaced[0]))
                query.set(spaced[0], spaced[1]);
        })

        return query;
    }
}

export function get_version() {
    return "0.5-rc3";
}