// @ts-ignore bun issues
import { spawnSync } from "bun";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname } from "path";
import { Buchta } from "./buchta";
import { BuchtaRequest } from "./request";
import { BuchtaResponse } from "./response";

export class BuchtaBundler {
    private customImports: string[] = new Array();
    private customRoutes: Map<string, string> = new Map();
    private files: string[] = new Array();
    private patches: Map<string, Function> = new Map();
    private rootDir: string;
    private bundleCode: string;
    private buildRoot = `${process.cwd()}/.buchta`;

    constructor(root: string) {
        this.rootDir = root;
    }

    /**
     * Tell bundler to include this file - usage is not recommended
     * @param {string} path - file path 
     */
    addFile(path: string) {
        this.files.push(path);
    }
    
    /**
     * Tell bundler to also include this file as custom file
     * @param {string} route - route where the file is located
     * @param {string} path - path of the file, i recommend using .js as file extension
     * @param {string} content - content of the file
     */
    addCustomFile(route: string, path: string, content: string) {
        this.customRoutes.set(route, `${this.buildRoot}/extras/${path}`);
        const basePath = dirname(`${this.buildRoot}/extras/${path}`);
        if (!existsSync(basePath))
            mkdirSync(basePath, {recursive: true});
        writeFileSync(`${this.buildRoot}/extras/${path}`, content);
        this.customImports.push(`${this.buildRoot}/extras/${path}`);
    }

    /**
     * Tell the bundler what it should do after the file was bundled and with fixed imports
     * @param {string} route - route that will be passed to the patching function
     * @param {Function} patch - the function that will be executed when patch was found
     */
    addPatch(route: string, patch: Function) {
        this.patches.set(route, patch);
    }

    /**
     * Prepares fs root for bundler
     */
    prepare() {
        if (!existsSync(this.buildRoot)) {
            mkdirSync(this.buildRoot);
        }

        if (!existsSync(`${this.buildRoot}/extras/`)) {
            mkdirSync(`${this.buildRoot}/extras/`);
        }
    }

    /**
     * Creates bundle
     */
    bundle(quiet=false) {
        spawnSync(["bun", "bun", ...this.files, ...this.customImports]);
        if (!existsSync(`${process.cwd()}/node_modules.bun`)) return;
        const { stdout, stderr } = spawnSync(["bun", `${process.cwd()}/node_modules.bun`]);
        if (!quiet)
            console.log(stderr.toString());
        this.bundleCode = stdout.toString();
    }
    
    /**
     * This function will bundle everything
     * @param {Buchta} server - server used for everything 
     */
    build(server: Buchta, quiet=false) {
        if (!existsSync(`${process.cwd()}/node_modules.bun`)) return;
        const { stderr } = spawnSync(["bun", "build", "--outdir", this.buildRoot, ...this.files, ...this.customImports]);
        if (!quiet)
            console.log(stderr.toString());

        for (const el of this.files) {
            const route = el.replace(this.rootDir, "");
            const finalPath = `${this.buildRoot}/public${route}`;
            const content = readFileSync(finalPath, {encoding: "utf-8"});
            const noLocalhost = content.replaceAll(/http.+?(?=\/n)/g, "");
            const newContent = noLocalhost.replaceAll(/node_modules.+bun/g, "buchta-build-bundle/");

            server.get(route, (_req: BuchtaRequest, res: BuchtaResponse) => {
                res.send(newContent);
                res.setHeader("content-type", "text/javascript");
            });
        }

        for (const [key, val] of this.customRoutes) {
            const route = val.replace(`${this.buildRoot}/extras/`, "");
            const finalPath = `${this.buildRoot}/.buchta/extras/${route}`;
            const content = readFileSync(finalPath, {encoding: "utf-8"});
            
            const noLocalhost = content.replaceAll(/http.+?(?=\/node_modules)/g, "");
            const newContent = noLocalhost.replaceAll(/node_modules.+bun/g, "buchta-build-bundle/");
            if (this.patches.has(key)) {
                this.patches.get(key).call(server, key, newContent);
            }
        }

        const bundle_content = this.bundleCode;
        server.get("/buchta-build-bundle/", (_req: BuchtaRequest, res: BuchtaResponse) => {
            res.send(bundle_content);
            res.setHeader("content-type", "text/javascript");
        })

        unlinkSync(`${process.cwd()}/node_modules.bun`);
    }
}